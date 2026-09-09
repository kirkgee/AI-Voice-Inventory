import { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  QueryConstraint,
  getFirestore,
  Timestamp,
  FirestoreError
} from 'firebase/firestore';

export interface UseFirestoreCollectionOptions {
  collectionName: string;
  tenantId: string;
  queryConstraints?: QueryConstraint[];
  enabled?: boolean;
}

export interface UseFirestoreCollectionReturn<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  fromCache: boolean;
  hasPendingWrites: boolean;
}

/**
 * Helper to recursively sanitize Firestore Timestamps to ISO strings.
 */
function sanitizeData(data: any): any {
  if (data === null || data === undefined) return data;
  
  if (data instanceof Timestamp) {
    return data.toDate().toISOString();
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }
  
  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const key of Object.keys(data)) {
      sanitized[key] = sanitizeData(data[key]);
    }
    return sanitized;
  }
  
  return data;
}

/**
 * A reusable React hook for subscribing to any Firestore collection with offline support.
 */
export function useFirestoreCollection<T>({
  collectionName,
  tenantId,
  queryConstraints = [],
  enabled = true
}: UseFirestoreCollectionOptions): UseFirestoreCollectionReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [hasPendingWrites, setHasPendingWrites] = useState<boolean>(false);

  // Memoize constraints so we don't cause infinite renders
  const memoizedConstraints = useMemo(() => queryConstraints, [JSON.stringify(queryConstraints)]);

  useEffect(() => {
    if (!enabled || !tenantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const db = getFirestore();
    const colRef = collection(db, collectionName);
    
    // Always enforce tenant isolation
    const q = query(
      colRef,
      where('tenantId', '==', tenantId),
      ...memoizedConstraints
    );

    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        const results: T[] = [];
        snapshot.forEach((doc) => {
          const rawData = doc.data();
          const docData = sanitizeData({ id: doc.id, ...rawData }) as T;
          results.push(docData);
        });

        setData(results);
        setFromCache(snapshot.metadata.fromCache);
        setHasPendingWrites(snapshot.metadata.hasPendingWrites);
        setLoading(false);
      },
      (err: FirestoreError) => {
        console.error(`Error fetching collection ${collectionName}:`, err);
        setError(new Error(err.message));
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [collectionName, tenantId, memoizedConstraints, enabled]);

  return {
    data,
    loading,
    error,
    fromCache,
    hasPendingWrites
  };
}
