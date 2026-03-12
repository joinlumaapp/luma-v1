// Offline request queue — stores failed write requests and retries them on reconnection
// Persisted to AsyncStorage so queued items survive app restarts

import AsyncStorage from '@react-native-async-storage/async-storage';

interface QueuedRequest {
  id: string;
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  url: string;
  data?: unknown;
  timestamp: number;
  retryCount: number;
}

interface ApiInstance {
  request: (config: { method: string; url: string; data?: unknown }) => Promise<unknown>;
}

const STORAGE_KEY = 'luma.requestQueue';
const MAX_RETRIES = 3;
const MAX_QUEUE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours — discard stale requests
let queue: QueuedRequest[] = [];

/** Persist queue to AsyncStorage */
async function persist(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    if (__DEV__) {
      console.warn('[RequestQueue] AsyncStorage yazma hatasi');
    }
  }
}

/** Load persisted queue from AsyncStorage */
async function load(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: QueuedRequest[] = JSON.parse(raw);
      const now = Date.now();
      queue = parsed.filter((item) => now - item.timestamp < MAX_QUEUE_AGE_MS);
      if (queue.length !== parsed.length) {
        await persist();
      }
    }
  } catch {
    if (__DEV__) {
      console.warn('[RequestQueue] AsyncStorage okuma hatasi');
    }
    queue = [];
  }
}

export const requestQueue = {
  /**
   * Initialize the queue by loading persisted items.
   * Call once at app startup.
   */
  async init(): Promise<void> {
    await load();
    if (__DEV__ && queue.length > 0) {
      console.log(`[RequestQueue] ${queue.length} bekleyen istek yuklendi`);
    }
  },

  /**
   * Add a failed write request to the queue for later retry.
   */
  add(method: QueuedRequest['method'], url: string, data?: unknown): void {
    queue.push({
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      method,
      url,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    });

    // Persist asynchronously — fire and forget
    persist();

    if (__DEV__) {
      console.log(`[RequestQueue] Kuyruga eklendi: ${method} ${url} (${queue.length} beklemede)`);
    }
  },

  /**
   * Flush the queue — replay all pending requests through the given axios instance.
   * Returns counts of successes and failures.
   */
  async flush(apiInstance: ApiInstance): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    // Take a snapshot and clear the queue
    const pending = [...queue];
    queue = [];

    const now = Date.now();

    for (const req of pending) {
      // Skip requests older than MAX_QUEUE_AGE_MS
      if (now - req.timestamp > MAX_QUEUE_AGE_MS) {
        if (__DEV__) {
          console.log(`[RequestQueue] Eski istek atildi: ${req.method} ${req.url}`);
        }
        continue;
      }

      try {
        await apiInstance.request({
          method: req.method,
          url: req.url,
          data: req.data,
        });
        success++;
      } catch {
        if (req.retryCount < MAX_RETRIES) {
          queue.push({ ...req, retryCount: req.retryCount + 1 });
        } else if (__DEV__) {
          console.warn(
            `[RequestQueue] Maksimum deneme asildi: ${req.method} ${req.url}`,
          );
        }
        failed++;
      }
    }

    await persist();

    if (__DEV__) {
      console.log(
        `[RequestQueue] Flush tamamlandi: ${success} basarili, ${failed} basarisiz, ${queue.length} kalan`,
      );
    }

    return { success, failed };
  },

  /** Number of queued requests */
  size(): number {
    return queue.length;
  },

  /** Clear all queued requests */
  async clear(): Promise<void> {
    queue = [];
    await persist();
  },
};
