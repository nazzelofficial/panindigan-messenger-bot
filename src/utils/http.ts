export class HttpError extends Error {
  public constructor(
    message: string,
    public readonly status: number | undefined,
    public readonly url: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export interface FetchJsonOptions {
  timeoutMs?: number;
  headers?: Record<string, string>;
  maxBytes?: number;
  method?: "GET" | "POST";
  body?: string;
}

const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;

/** Fetches a JSON document with a hard timeout and a response-size ceiling. */
export async function fetchJson<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        accept: "application/json",
        "user-agent": "PanindiganMessengerBot/0.1 (+production)",
        ...options.headers,
      },
      body: options.body,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new HttpError(
      `Request to ${new URL(url).host} failed: ${error instanceof Error ? error.message : "network error"}`,
      undefined,
      url,
    );
  }
  if (!response.ok) {
    throw new HttpError(`Remote service returned HTTP ${response.status}.`, response.status, url);
  }
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (declaredLength > maxBytes) {
    throw new HttpError("Remote response exceeds the configured size limit.", response.status, url);
  }
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    throw new HttpError("Remote response exceeds the configured size limit.", response.status, url);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError("Remote service returned malformed JSON.", response.status, url);
  }
}

export async function fetchText(url: string, options: FetchJsonOptions = {}): Promise<string> {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: { "user-agent": "PanindiganMessengerBot/0.1 (+production)", ...options.headers },
    body: options.body,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok)
    throw new HttpError(`Remote service returned HTTP ${response.status}.`, response.status, url);
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    throw new HttpError("Remote response exceeds the configured size limit.", response.status, url);
  }
  return text;
}
