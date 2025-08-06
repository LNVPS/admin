import { useState, useEffect, useCallback } from "react";

interface UseApiCallResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  retry: () => void;
}

export function useApiCall<T>(
  apiCall: () => Promise<T>,
  dependencies: any[] = [],
): UseApiCallResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const executeCall = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    executeCall();
  }, [executeCall]);

  const retry = useCallback(() => {
    executeCall();
  }, [executeCall]);

  return { data, loading, error, retry };
}
