/**
 * @fileoverview Offline sync queue that stores operations in IndexedDB 
 * and replays them when connectivity is restored.
 */
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { connectivity } from './connectivity';

export interface SyncOperation {
  id: string;
  type: string;
  payload: any;
  createdAt: string;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'failed' | 'dead';
}

interface SyncQueueDB extends DBSchema {
  outbox: {
    key: string;
    value: SyncOperation;
    indexes: {
      'by-status': string;
      'by-created': string;
    };
  };
}

export type SyncHandler = (payload: any) => Promise<void>;

class SyncQueue {
  private dbPromise: Promise<IDBPDatabase<SyncQueueDB>> | null = null;
  private handlers: Map<string, SyncHandler> = new Map();
  private isProcessing = false;

  constructor() {
    if (typeof window === 'undefined') return;

    this.dbPromise = openDB<SyncQueueDB>('ai-voice-inventory-sync', 1, {
      upgrade(db) {
        const store = db.createObjectStore('outbox', { keyPath: 'id' });
        store.createIndex('by-status', 'status');
        store.createIndex('by-created', 'createdAt');
      },
    });

    connectivity.addEventListener('change', (event) => {
      if (event.isOnline && !this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Registers a handler for a specific operation type.
   */
  public registerHandler(type: string, handlerFn: SyncHandler) {
    this.handlers.set(type, handlerFn);
  }

  /**
   * Adds an operation to the sync queue.
   */
  public async enqueue(type: string, payload: any, maxRetries = 5): Promise<string> {
    if (!this.dbPromise) throw new Error('IndexedDB not initialized');
    
    const db = await this.dbPromise;
    const id = crypto.randomUUID();
    
    const operation: SyncOperation = {
      id,
      type,
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries,
      status: 'pending'
    };

    await db.put('outbox', operation);
    
    if (connectivity.state === 'online') {
      this.processQueue();
    }
    
    return id;
  }

  /**
   * Processes the pending operations in the queue using FIFO.
   */
  public async processQueue(): Promise<void> {
    if (!this.dbPromise || this.isProcessing || connectivity.state === 'offline') return;

    this.isProcessing = true;
    try {
      const db = await this.dbPromise;
      const tx = db.transaction('outbox', 'readonly');
      const index = tx.store.index('by-created');
      
      let cursor = await index.openCursor();
      const operations: SyncOperation[] = [];
      
      while (cursor) {
        if (cursor.value.status === 'pending' || cursor.value.status === 'failed') {
          operations.push(cursor.value);
        }
        cursor = await cursor.continue();
      }

      for (const op of operations) {
        if (!navigator.onLine) break;
        await this.processOperation(op);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processOperation(op: SyncOperation): Promise<void> {
    if (!this.dbPromise) return;
    const db = await this.dbPromise;

    op.status = 'processing';
    await db.put('outbox', op);

    try {
      const handler = this.handlers.get(op.type);
      if (!handler) throw new Error(`No handler registered for type: ${op.type}`);

      await handler(op.payload);
      
      // Success, remove from queue
      await db.delete('outbox', op.id);
    } catch (error) {
      console.error(`Failed to process operation ${op.id}:`, error);
      op.retryCount++;
      
      if (op.retryCount >= op.maxRetries) {
        op.status = 'dead';
      } else {
        op.status = 'failed';
      }
      
      await db.put('outbox', op);

      // Exponential backoff if failed (wait before processing others if needed)
      if (op.status === 'failed') {
        const backoffMs = Math.min(1000 * Math.pow(2, op.retryCount), 60000);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  /**
   * Returns the number of pending or failed operations.
   */
  public async getQueueDepth(): Promise<number> {
    if (!this.dbPromise) return 0;
    const db = await this.dbPromise;
    const count = await db.count('outbox');
    
    // We count all except 'dead' ones (or just count all in outbox)
    // For simplicity, we can fetch all and filter, or just return total outbox size
    const all = await db.getAll('outbox');
    return all.filter(op => op.status !== 'dead').length;
  }

  /**
   * Returns operations that have exceeded their max retries.
   */
  public async getDeadLetters(): Promise<SyncOperation[]> {
    if (!this.dbPromise) return [];
    const db = await this.dbPromise;
    const all = await db.getAll('outbox');
    return all.filter(op => op.status === 'dead');
  }

  /**
   * Moves a dead letter operation back to pending state.
   */
  public async retryDeadLetter(id: string): Promise<void> {
    if (!this.dbPromise) return;
    const db = await this.dbPromise;
    const op = await db.get('outbox', id);
    if (op && op.status === 'dead') {
      op.status = 'pending';
      op.retryCount = 0;
      await db.put('outbox', op);
      this.processQueue();
    }
  }

  /**
   * Clears out dead letters or completed items (if they weren't deleted).
   */
  public async clearCompleted(): Promise<void> {
    if (!this.dbPromise) return;
    const db = await this.dbPromise;
    const all = await db.getAll('outbox');
    const toDelete = all.filter(op => op.status === 'dead');
    
    const tx = db.transaction('outbox', 'readwrite');
    for (const op of toDelete) {
      tx.store.delete(op.id);
    }
    await tx.done;
  }
}

export const syncQueue = new SyncQueue();
