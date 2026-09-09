/**
 * @fileoverview Connectivity monitor for tracking network state and offline status.
 * Handles online/offline events, network quality, and heartbeat pinging.
 */

export type ConnectionState = 'online' | 'offline' | 'degraded';

export interface ConnectivityChangeEvent {
  state: ConnectionState;
  isOnline: boolean;
  isOffline: boolean;
  isDegraded: boolean;
  lastOnlineAt: Date | null;
  pendingWriteCount: number;
}

type EventCallback = (event: ConnectivityChangeEvent) => void;

/**
 * A singleton connectivity monitor that detects network state.
 */
class ConnectivityMonitor {
  private _state: ConnectionState = 'online';
  private _lastOnlineAt: Date | null = null;
  private _pendingWriteCount: number = 0;
  private _listeners: Set<EventCallback> = new Set();
  private _heartbeatTimer: number | null = null;

  constructor() {
    if (typeof window === 'undefined') return;

    this._state = navigator.onLine ? 'online' : 'offline';
    this._lastOnlineAt = this._state === 'online' ? new Date() : null;

    // Listen to browser network events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Listen to network information API if available
    const nav = navigator as any;
    if (nav.connection) {
      nav.connection.addEventListener('change', this.handleConnectionChange);
    }

    this.startHeartbeat();
    this.updateState();
  }

  /**
   * The current connection state.
   */
  get state(): ConnectionState {
    return this._state;
  }

  /**
   * Timestamp of when the device was last online.
   */
  get lastOnlineAt(): Date | null {
    return this._lastOnlineAt;
  }

  /**
   * Count of pending writes (updated externally by the DAL).
   */
  get pendingWriteCount(): number {
    return this._pendingWriteCount;
  }

  set pendingWriteCount(count: number) {
    if (this._pendingWriteCount !== count) {
      this._pendingWriteCount = count;
      this.emitChange();
    }
  }

  /**
   * Whether all pending sync operations are complete.
   */
  get isPendingSyncComplete(): boolean {
    return this._pendingWriteCount === 0;
  }

  /**
   * Adds an event listener for connectivity changes.
   */
  public addEventListener(type: 'change', callback: EventCallback): void {
    if (type === 'change') {
      this._listeners.add(callback);
      // Immediately emit the current state to the new listener
      callback(this.getEventData());
    }
  }

  /**
   * Removes an event listener.
   */
  public removeEventListener(type: 'change', callback: EventCallback): void {
    if (type === 'change') {
      this._listeners.delete(callback);
    }
  }

  private handleOnline = () => {
    this._state = 'online';
    this._lastOnlineAt = new Date();
    this.updateState();
    this.startHeartbeat();
  };

  private handleOffline = () => {
    this._state = 'offline';
    this.stopHeartbeat();
    this.emitChange();
  };

  private handleConnectionChange = () => {
    this.updateState();
  };

  private updateState() {
    if (!navigator.onLine) {
      if (this._state !== 'offline') {
        this._state = 'offline';
        this.emitChange();
      }
      return;
    }

    const nav = navigator as any;
    let newState: ConnectionState = 'online';

    if (nav.connection) {
      const effectiveType = nav.connection.effectiveType;
      if (effectiveType === 'slow-2g' || effectiveType === '2g') {
        newState = 'degraded';
      }
    }

    if (this._state !== newState) {
      this._state = newState;
      if (newState === 'online') {
        this._lastOnlineAt = new Date();
      }
      this.emitChange();
      this.startHeartbeat();
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    if (this._state === 'offline') return;

    const interval = this._state === 'degraded' ? 10000 : 30000;
    this._heartbeatTimer = window.setTimeout(() => this.ping(), interval);
  }

  private stopHeartbeat() {
    if (this._heartbeatTimer !== null) {
      window.clearTimeout(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }

  private async ping() {
    if (!navigator.onLine) return;

    const startTime = performance.now();
    try {
      // Use HEAD request to own origin for a lightweight heartbeat
      const response = await fetch(window.location.origin, {
        method: 'HEAD',
        cache: 'no-store'
      });

      const duration = performance.now() - startTime;

      if (response.ok) {
        if (duration > 3000) {
          // Took longer than 3s, consider degraded
          if (this._state !== 'degraded') {
            this._state = 'degraded';
            this.emitChange();
          }
        } else {
          // Fast enough, consider online
          if (this._state !== 'online') {
            this._state = 'online';
            this._lastOnlineAt = new Date();
            this.emitChange();
          } else {
            this._lastOnlineAt = new Date();
          }
        }
      } else {
        // Server returned an error, but we are technically connected
        // We'll keep the state as is, or mark as degraded
        if (this._state === 'online') {
          this._state = 'degraded';
          this.emitChange();
        }
      }
    } catch (error) {
      // Network error during fetch implies offline
      if (this._state !== 'offline') {
        this._state = 'offline';
        this.emitChange();
      }
    } finally {
      this.startHeartbeat();
    }
  }

  private getEventData(): ConnectivityChangeEvent {
    return {
      state: this._state,
      isOnline: this._state === 'online',
      isOffline: this._state === 'offline',
      isDegraded: this._state === 'degraded',
      lastOnlineAt: this._lastOnlineAt,
      pendingWriteCount: this._pendingWriteCount
    };
  }

  private emitChange() {
    const event = this.getEventData();
    this._listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in connectivity event listener:', error);
      }
    });
  }
}

export const connectivity = new ConnectivityMonitor();
