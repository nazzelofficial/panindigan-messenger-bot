/**
 * Browser-like HTTP fetch with a hard "zero direct Facebook" policy.
 *
 * Every Facebook-bound request the bot makes MUST either go through the
 * automation pipeline (automate HTTP/MQTT transports, which use
 * `PANINDIGAN_HTTP_PROXY` when set) or through this helper. When the proxy
 * env var is configured, this helper routes every request through it as well.
 * Facebook-looking hosts are NEVER fetched directly: without a proxy they
 * fail closed instead of exposing the server's datacenter IP to Facebook.
 *
 * Non-Facebook hosts (Wikipedia, Dog CEO, …) are fetched directly, still with
 * browser-like headers.
 */

import { fetch as undiciFetch, ProxyAgent } from 'undici';
import { BotLogger } from './logger.js';

const FB_HOST_PATTERNS = [
  /(^|\.)facebook\.com$/i,
  /(^|\.)fbcdn\.net$/i,
  /(^|\.)fbsbx\.com$/i,
  /(^|\.)fb\.net$/i,
  /(^|\.)fb\.watch$/i,
  /(^|\.)messenger\.com$/i,
  /(^|\.)instagram\.com$/i,
  /(^|\.)cdninstagram\.com$/i,
  /(^|\.)threads\.net$/i,
  /(^|\.)threads\.com$/i,
];

export function isFacebookHost(hostname: string): boolean {
  return FB_HOST_PATTERNS.some((re) => re.test(hostname));
}

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
  Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Sec-Fetch-Site': 'cross-site',
  'Sec-Fetch-Mode': 'no-cors',
  'Sec-Fetch-Dest': 'image',
};

let cachedAgent: ProxyAgent | null | undefined;

function getProxyAgent(): ProxyAgent | null {
  if (cachedAgent === undefined) {
    const proxy = process.env.PANINDIGAN_HTTP_PROXY?.trim();
    cachedAgent = proxy ? new ProxyAgent(proxy) : null;
  }
  return cachedAgent;
}

/** Testing hook: re-resolve the proxy agent from the environment. */
export function __resetProxyAgentCacheForTests(): void {
  cachedAgent = undefined;
}

export interface ProxyFetchBufferOptions {
  /** Max response size in bytes (default 8 MiB). */
  maxBytes?: number;
  /** Abort timeout in milliseconds (default 20 s). */
  timeoutMs?: number;
}

/**
 * Fetches a URL and returns the body as a Buffer, or `null` on any failure.
 *
 * - Facebook-looking hosts with no `PANINDIGAN_HTTP_PROXY` configured return
 *   `null` (fail closed — never fetched directly).
 * - Redirects are followed through the same proxy/agent.
 * - Non-2xx responses and oversized bodies return `null`.
 */
export async function proxyFetchBuffer(
  url: string,
  options: ProxyFetchBufferOptions = {},
): Promise<Buffer | null> {
  const maxBytes = options.maxBytes ?? 8 * 1024 * 1024;
  const timeoutMs = options.timeoutMs ?? 20_000;

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return null;
  }

  const agent = getProxyAgent();
  const isFb = isFacebookHost(hostname);
  if (isFb && !agent) {
    BotLogger.debug('proxyFetch: blocked direct Facebook fetch — set PANINDIGAN_HTTP_PROXY');
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await undiciFetch(url, {
      dispatcher: agent ?? undefined,
      signal: controller.signal,
      headers: BROWSER_HEADERS,
      redirect: 'follow',
    });
    if (!response.ok) {
      BotLogger.debug(`proxyFetch: HTTP ${response.status} for ${hostname}`);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > maxBytes) {
      BotLogger.debug(`proxyFetch: body too large (${arrayBuffer.byteLength} bytes)`);
      return null;
    }
    return Buffer.from(arrayBuffer);
  } catch (error) {
    BotLogger.debug(
      `proxyFetch: failed for ${hostname}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  } finally {
    clearTimeout(timer);
  }
}
