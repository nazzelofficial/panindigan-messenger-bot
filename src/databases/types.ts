export type HealthState = "connected" | "degraded" | "disconnected";

export interface DatabaseHealth {
  readonly name: string;
  readonly state: HealthState;
  readonly detail?: string;
  readonly checkedAt: number;
}

export interface DatabaseComponent {
  readonly name: string;
  connect(): Promise<void>;
  health(): Promise<DatabaseHealth>;
  close(): Promise<void>;
}

export class DatabaseUnavailableError extends Error {
  public constructor(database: string, operation: string, cause?: unknown, detail?: string) {
    super(
      detail
        ? `${database} is unavailable while performing ${operation}: ${detail}`
        : `${database} is unavailable while performing ${operation}.`,
      { cause },
    );
    this.name = "DatabaseUnavailableError";
  }
}

/** Removes anything that could identify a URL, token or credential from an error. */
export function sanitizeErrorDetail(error: unknown): string {
  if (!(error instanceof Error)) return "unknown error";
  return error.message
    .replace(/[a-z][a-z0-9+.-]*:\/\/[^\s"'()]+/gi, "[REDACTED_URL]")
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/token[=:]\s*\S+/gi, "token=[REDACTED]")
    .slice(0, 300);
}
