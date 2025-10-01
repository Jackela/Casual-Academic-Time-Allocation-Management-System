import { flushSync } from "react-dom";
import type { Dispatch, SetStateAction } from "react";

export interface MutationState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export const createInitialMutationState = <T>(): MutationState<T> => ({
  data: null,
  loading: false,
  error: null,
});

export const safeSetMutationState = <T>(
  setState: Dispatch<SetStateAction<MutationState<T>>>,
  nextState: MutationState<T>,
) => {
  try {
    flushSync(() => setState(nextState));
  } catch {
    setState(nextState);
  }
};
