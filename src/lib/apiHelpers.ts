import type { MessengerClient } from 'panindigan-automate';

export async function safeGetThreadInfo(client: MessengerClient, threadId: string | number): Promise<any | null> {
  try {
    const result = await client.getThread(String(threadId).trim());
    return result;
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    if (errorMsg.includes('Not Found') || errorMsg.includes('not valid JSON') || errorMsg.includes('Unexpected token')) {
      return null;
    }
    throw error;
  }
}

export async function safeGetUserInfo(client: MessengerClient, userIds: string | string[]): Promise<Record<string, any>> {
  try {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    const cleanIds = ids.map((id) => String(id).trim());
    const result = await getUserInfoBulk(client, cleanIds);
    return result || {};
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    if (errorMsg.includes('Not Found') || errorMsg.includes('not valid JSON') || errorMsg.includes('Unexpected token')) {
      return {};
    }
    throw error;
  }
}

/**
 * Bulk user lookup: fans out to one `getUser` call per id (bounded to 8
 * concurrent requests), mirroring the legacy batched `getUserInfo` output
 * shape: `{ [userId]: user }`.
 */
export async function getUserInfoBulk(
  client: MessengerClient,
  cleanIds: string[],
): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  for (let i = 0; i < cleanIds.length; i += 8) {
    const chunk = cleanIds.slice(i, i + 8);
    const results = await Promise.allSettled(chunk.map((id) => client.getUser(id)));
    results.forEach((settled, index) => {
      const key = chunk[index];
      if (settled.status === 'fulfilled' && settled.value && key !== undefined) {
        out[key] = settled.value;
      }
    });
  }
  return out;
}

export async function safeGetThreadList(client: MessengerClient, limit: number, _timestamp: any, tags?: string[]): Promise<any[]> {
  try {
    const result = await client.getThreadList({
      limit: Number.isFinite(Number(limit)) ? Math.min(Math.max(1, Number(limit)), 100) : 20,
      ...(Array.isArray(tags) && tags.length > 0 ? { tags } : {}),
    });
    return [...(result.threads ?? [])];
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    if (errorMsg.includes('Not Found') || errorMsg.includes('not valid JSON') || errorMsg.includes('Unexpected token')) {
      return [];
    }
    throw error;
  }
}

/**
 * Checks whether the bot is a group admin using the thread's admin list.
 *
 * Panindigan Automate's ThreadInfo does not expose a thread admin list, so
 * `getThread()` never reports one. Returns:
 *   - `true`  → bot is in the admin list
 *   - `false` → admin list is available and the bot is not in it
 *   - `null`  → admin list unavailable (cannot verify)
 *
 * Callers doing single-user actions (kick/promote/…) should proceed when the
 * result is `null` and rely on Facebook enforcing permissions server-side.
 * Callers doing mass actions (removeall) MUST fail closed on `null`.
 */
export function botGroupAdminStatus(threadInfo: any, _botId: string | number): boolean | null {
  const adminIDs: any[] = (threadInfo?.adminIDs || [])
    .map((a: any) => String(a?.id ?? a ?? '').trim())
    .filter(Boolean);
  if (adminIDs.length === 0) return null;
  return adminIDs.includes(String(_botId).trim());
}

export function isApiError(error: any): boolean {
  const errorMsg = error?.message || String(error);
  return errorMsg.includes('Not Found') ||
         errorMsg.includes('not valid JSON') ||
         errorMsg.includes('Unexpected token');
}
