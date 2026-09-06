import { useState, useCallback } from 'react';

export function useLoading(initial = false) {
  const [isLoading, setIsLoading] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const withLoading = useCallback(async <T>(fn: () => Promise<T>): Promise<T | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fn();
      return result;
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Une erreur est survenue';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, error, setError, withLoading };
}
