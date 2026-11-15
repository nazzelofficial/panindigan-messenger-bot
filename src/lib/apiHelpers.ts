export async function safeGetThreadInfo(api: any, threadId: string | number): Promise<any | null> {
  try {
    const result = await api.getThreadInfo(String(threadId).trim());
    return result;
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    if (errorMsg.includes('Not Found') || errorMsg.includes('not valid JSON') || errorMsg.includes('Unexpected token')) {
      return null;
    }
    throw error;
  }
}

export async function safeGetUserInfo(api: any, userIds: string | string[]): Promise<any> {
  try {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    const cleanIds = ids.map(id => String(id).trim());
    const result = await api.getUserInfo(cleanIds);
    return result || {};
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    if (errorMsg.includes('Not Found') || errorMsg.includes('not valid JSON') || errorMsg.includes('Unexpected token')) {
      return {};
    }
    throw error;
  }
}

export async function safeGetThreadList(api: any, limit: number, timestamp: any, tags: string[]): Promise<any[]> {
  try {
    const result = await api.getThreadList(limit, timestamp, tags);
    return result || [];
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
 * panindigan-automate does not expose thread admin lists, so `getThreadInfo()`
 * always reports `adminIDs: []`. Returns:
 *   - `true`  → bot is in the admin list
 *   - `false` → admin list is available and the bot is not in it
 *   - `null`  → admin list unavailable (cannot verify)
 *
 * Callers doing single-user actions (kick/promote/…) should proceed when the
 * result is `null` and rely on Facebook enforcing permissions server-side.
 * Callers doing mass actions (removeall) MUST fail closed on `null`.
 */
export function botGroupAdminStatus(threadInfo: any, botId: string | number): boolean | null {
  const adminIDs = (threadInfo?.adminIDs || [])
    .map((a: any) => String(a?.id ?? a ?? '').trim())
    .filter(Boolean);
  if (adminIDs.length === 0) return null;
  return adminIDs.includes(String(botId).trim());
}

export function isApiError(error: any): boolean {
  const errorMsg = error?.message || String(error);
  return errorMsg.includes('Not Found') || 
         errorMsg.includes('not valid JSON') || 
         errorMsg.includes('Unexpected token');
}
