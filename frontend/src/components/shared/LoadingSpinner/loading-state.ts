import { useCallback, useState } from 'react';

export interface LoadingStateController {
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  startLoading: () => void;
  stopLoading: () => void;
  toggleLoading: () => void;
}

export function useLoadingState(initialState = false): LoadingStateController {
  const [loading, setLoading] = useState(initialState);

  const startLoading = useCallback(() => {
    setLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setLoading(false);
  }, []);

  const toggleLoading = useCallback(() => {
    setLoading((previous) => !previous);
  }, []);

  return {
    loading,
    setLoading,
    startLoading,
    stopLoading,
    toggleLoading,
  };
}

export function withLoadingState<TArgs extends unknown[], TResult>(
  asyncFn: (...args: TArgs) => Promise<TResult> | TResult,
  setLoading: (loading: boolean) => void,
) {
  return async (...args: TArgs): Promise<TResult> => {
    setLoading(true);
    try {
      return await Promise.resolve(asyncFn(...args));
    } finally {
      setLoading(false);
    }
  };
}
