export type SecureLogPrimitive = string | number | boolean | null | undefined;

export type SecureLogValue =
  | SecureLogPrimitive
  | SecureLogValue[]
  | { [key: string]: SecureLogValue }
  | Error
  | Date;

export type SecureLogPayload = SecureLogValue | Record<string, SecureLogValue> | unknown;

export interface EnvironmentDebugInfo {
  mode: string;
  isE2E: boolean;
  testFlag: boolean;
}

