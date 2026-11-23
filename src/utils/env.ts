/**
 * Environment access. Credentials are only ever read here; no other module
 * should call `process.env` for a secret directly.
 */

export class EnvironmentError extends Error {
  public readonly variableName: string;

  public constructor(variableName: string, message: string) {
    super(message);
    this.name = "EnvironmentError";
    this.variableName = variableName;
  }
}

export function readEnvironment(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value === "" ? undefined : value;
}

export function requireEnvironment(name: string): string {
  const value = readEnvironment(name);
  if (value === undefined) {
    throw new EnvironmentError(
      name,
      `Required environment variable "${name}" is not set. Add it to your .env file.`,
    );
  }
  return value;
}

export function readEnvironmentJson<T>(name: string): T | undefined {
  const raw = readEnvironment(name);
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new EnvironmentError(name, `Environment variable "${name}" does not contain valid JSON.`);
  }
}

/** A normalized Messenger user or group identifier. */
export function normalizeAccountId(value: string): string {
  return value.trim().replace(/^fbid:/i, "");
}

export function isValidAccountId(value: string): boolean {
  return /^\d{4,25}$/.test(normalizeAccountId(value));
}

export function assertEnvironmentReference(value: string, path: string): void {
  if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(value)) {
    throw new Error(`${path} must be a valid environment variable name.`);
  }
}
