// Offline request queue — stores failed write requests and retries them on reconnection

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

const MAX_RETRIES = 3;
const MAX_QUEUE_AGE_MS = 5 * 60 * 1000; // 5 minutes — discard stale requests
const queue: QueuedRequest[] = [];

export const requestQueue = {
  /**
   * Add a failed write request to the queue for later retry.
   */
  add(method: QueuedRequest['method'], url: string, data?: unknown): void {
    queue.push({
      id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
      method,
      url,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    });
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
    queue.length = 0;

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
        }
        failed++;
      }
    }

    if (__DEV__) {
      console.log(
        `[RequestQueue] Flush tamamlandi: ${success} basarili, ${failed} basarisiz, ${queue.length} kalan`
      );
    }

    return { success, failed };
  },

  /** Number of queued requests */
  size(): number {
    return queue.length;
  },

  /** Clear all queued requests */
  clear(): void {
    queue.length = 0;
  },
};
