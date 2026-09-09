import { useState, useEffect } from 'react';
import { connectivity, ConnectionState } from '../lib/connectivity';

export interface UseConnectivityReturn {
  state: ConnectionState;
  isOnline: boolean;
  isDegraded: boolean;
  isOffline: boolean;
  lastOnlineAt: Date | null;
  pendingWrites: number;
}

/**
 * React hook that subscribes to the singleton connectivity monitor.
 * Returns the current network state and pending sync count.
 */
export function useConnectivity(): UseConnectivityReturn {
  const [state, setState] = useState<ConnectionState>(connectivity.state);
  const [isOnline, setIsOnline] = useState<boolean>(connectivity.state === 'online');
  const [isDegraded, setIsDegraded] = useState<boolean>(connectivity.state === 'degraded');
  const [isOffline, setIsOffline] = useState<boolean>(connectivity.state === 'offline');
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(connectivity.lastOnlineAt);
  const [pendingWrites, setPendingWrites] = useState<number>(connectivity.pendingWriteCount);

  useEffect(() => {
    const handleConnectivityChange = (event: any) => {
      setState(event.state);
      setIsOnline(event.isOnline);
      setIsDegraded(event.isDegraded);
      setIsOffline(event.isOffline);
      setLastOnlineAt(event.lastOnlineAt);
      setPendingWrites(event.pendingWriteCount);
    };

    connectivity.addEventListener('change', handleConnectivityChange);

    return () => {
      connectivity.removeEventListener('change', handleConnectivityChange);
    };
  }, []);

  return {
    state,
    isOnline,
    isDegraded,
    isOffline,
    lastOnlineAt,
    pendingWrites
  };
}
