import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * In-process background queue with a concurrency cap. Job state is persisted
 * on the Document (processingStatus), so unfinished jobs are re-queued at boot.
 * To scale out, replace this class with BullMQ/Redis keeping the same interface.
 */
class DocumentQueue {
  constructor(concurrency) {
    this.concurrency = concurrency;
    this.pending = [];
    this.active = 0;
    this.handler = null;
  }
  setHandler(fn) { this.handler = fn; }
  enqueue(id) {
    const key = String(id);
    if (!this.pending.includes(key)) this.pending.push(key);
    setImmediate(() => this.#drain());
  }
  remove(id) { this.pending = this.pending.filter((x) => x !== String(id)); }
  async #drain() {
    while (this.active < this.concurrency && this.pending.length && this.handler) {
      const id = this.pending.shift();
      this.active++;
      this.handler(id)
        .catch((err) => logger.error(`Job ${id} crashed:`, err))
        .finally(() => { this.active--; this.#drain(); });
    }
  }
  async drained() {
    while (this.active || this.pending.length) await new Promise((r) => setTimeout(r, 100));
  }
}

export const documentQueue = new DocumentQueue(env.queueConcurrency);