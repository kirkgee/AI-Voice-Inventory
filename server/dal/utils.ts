export interface DalError {
  error: string;
  code: 'NETWORK_ERROR' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'VALIDATION_ERROR' | 'UNKNOWN_ERROR';
  retryable: boolean;
  details?: string;
}

export type DalResult<T> = { success: true; data: T } | { success: false; error: DalError };

export function isRetryableError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    const code = (error as any).code;
    return code === 'unavailable' || code === 'deadline-exceeded' || code === 'resource-exhausted';
  }
  return false;
}

export function handleDalError(error: unknown): DalError {
  if (typeof error === 'object' && error !== null) {
    const code = (error as any).code as string;
    
    // Check if it's already a DalError
    if (['NETWORK_ERROR', 'NOT_FOUND', 'UNAUTHORIZED', 'VALIDATION_ERROR', 'UNKNOWN_ERROR'].includes(code) && 'retryable' in error) {
      return error as DalError;
    }

    const message = (error as any).message || String(error);
    
    if (code === 'not-found') {
      return { error: message, code: 'NOT_FOUND', retryable: false, details: String(error) };
    }
    if (code === 'permission-denied' || code === 'unauthenticated') {
      return { error: message, code: 'UNAUTHORIZED', retryable: false, details: String(error) };
    }
    if (code === 'invalid-argument' || code === 'failed-precondition' || code === 'out-of-range') {
      return { error: message, code: 'VALIDATION_ERROR', retryable: false, details: String(error) };
    }
    if (isRetryableError(error)) {
      return { error: message, code: 'NETWORK_ERROR', retryable: true, details: String(error) };
    }
  }
  
  return {
    error: error instanceof Error ? error.message : String(error),
    code: 'UNKNOWN_ERROR',
    retryable: false,
    details: String(error),
  };
}

export function sanitizeDoc(doc: any): Record<string, any> {
  const data = doc.data();
  const clean: Record<string, any> = { id: doc.id };
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof (value as any).toDate === 'function') {
      clean[key] = (value as any).toDate().toISOString();
    } else {
      clean[key] = value;
    }
  }
  return clean;
}
