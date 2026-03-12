// Offline action queue — persists queueable actions to AsyncStorage
// and replays them in FIFO order when connectivity is restored.

import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Types ────────────────────────────────────────────────────────────

/** Action types that can be queued while offline */
export type OfflineActionType =
  | 'like'
  | 'pass'
  | 'superlike'
  | 'send_message'
  | 'update_profile'
  | 'undo_swipe'
  | 'react_message'
  | 'report_user'
  | 'block_user';

export interface OfflineAction {
  id: string;
  type: OfflineActionType;
  /** HTTP method to use when replaying */
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  /** API endpoint URL */
  url: string;
  /** Request body */
  payload: Record<string, unknown> | undefined;
  /** Timestamp when the action was queued */
  createdAt: number;
  /** Number of replay attempts so far */
  retryCount: number;
}

interface ApiInstance {
  request: (config: { method: string; url: string; data?: unknown }) => Promise<unknown>;
}

interface FlushResult {
  success: number;
  failed: number;
  remaining: number;
}

// ── Constants ────────────────────────────────────────────────────────

const STORAGE_KEY = 'luma.offlineQueue';
const MAX_RETRIES = 3;
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── In-memory queue (synced with AsyncStorage) ───────────────────────

let queue: OfflineAction[] = [];
let isProcessing = false;

/** Generate a unique ID for queued actions */
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/** Persist the current queue to AsyncStorage */
async function persistQueue(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    if (__DEV__) {
      console.warn('[OfflineQueue] AsyncStorage yazma hatasi');
    }
  }
}

/** Load persisted queue from AsyncStorage into memory */
async function loadQueue(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: OfflineAction[] = JSON.parse(raw);
      // Filter out stale items on load
      const now = Date.now();
      queue = parsed.filter((item) => now - item.createdAt < MAX_AGE_MS);
      if (queue.length !== parsed.length) {
        await persistQueue();
      }
    }
  } catch {
    if (__DEV__) {
      console.warn('[OfflineQueue] AsyncStorage okuma hatasi');
    }
    queue = [];
  }
}

// ── Public API ───────────────────────────────────────────────────────

export const offlineQueue = {
  /**
   * Initialize the queue by loading persisted items from AsyncStorage.
   * Call once at app startup.
   */
  async init(): Promise<void> {
    await loadQueue();
    if (__DEV__ && queue.length > 0) {
      console.log(`[OfflineQueue] ${queue.length} bekleyen islem yuklendi`);
    }
  },

  /**
   * Add an action to the offline queue.
   * Persists immediately to AsyncStorage.
   */
  async enqueue(
    type: OfflineActionType,
    method: OfflineAction['method'],
    url: string,
    payload?: Record<string, unknown>,
  ): Promise<void> {
    const action: OfflineAction = {
      id: generateId(),
      type,
      method,
      url,
      payload,
      createdAt: Date.now(),
      retryCount: 0,
    };

    queue.push(action);
    await persistQueue();

    if (__DEV__) {
      console.log(
        `[OfflineQueue] Kuyruga eklendi: ${type} ${method} ${url} (toplam: ${queue.length})`,
      );
    }
  },

  /**
   * Process all queued actions in FIFO order.
   * Failed items (under max retries) are re-queued at the end.
   * Stale items (older than 24h) are discarded.
   *
   * Returns a summary of the flush results.
   */
  async processQueue(apiInstance: ApiInstance): Promise<FlushResult> {
    if (isProcessing) {
      return { success: 0, failed: 0, remaining: queue.length };
    }

    isProcessing = true;

    const now = Date.now();
    const pending = [...queue];
    queue = [];

    let success = 0;
    let failed = 0;
    const retryBucket: OfflineAction[] = [];

    for (const action of pending) {
      // Discard stale actions (older than 24 hours)
      if (now - action.createdAt > MAX_AGE_MS) {
        if (__DEV__) {
          console.log(`[OfflineQueue] Eski islem atildi: ${action.type} ${action.url}`);
        }
        continue;
      }

      try {
        await apiInstance.request({
          method: action.method,
          url: action.url,
          data: action.payload,
        });
        success++;
      } catch {
        failed++;
        if (action.retryCount < MAX_RETRIES) {
          retryBucket.push({ ...action, retryCount: action.retryCount + 1 });
        } else if (__DEV__) {
          console.warn(
            `[OfflineQueue] Maksimum deneme asildi, atiliyor: ${action.type} ${action.url}`,
          );
        }
      }
    }

    // Add retry items back to the queue
    queue.push(...retryBucket);
    await persistQueue();

    isProcessing = false;

    if (__DEV__) {
      console.log(
        `[OfflineQueue] Isleme tamamlandi: ${success} basarili, ${failed} basarisiz, ${queue.length} kalan`,
      );
    }

    return { success, failed, remaining: queue.length };
  },

  /** Number of items currently in the queue */
  getQueueSize(): number {
    return queue.length;
  },

  /** Get a readonly snapshot of the current queue */
  getQueue(): readonly OfflineAction[] {
    return [...queue];
  },

  /** Clear all queued actions */
  async clear(): Promise<void> {
    queue = [];
    await persistQueue();
  },
};
