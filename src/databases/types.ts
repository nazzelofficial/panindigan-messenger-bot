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
  public constructor(database: string, operation: string, cause?: unknown) {
    super(`${database} is unavailable while performing ${operation}.`);
    this.name = "DatabaseUnavailableError";
    this.cause = cause;
  }
}
