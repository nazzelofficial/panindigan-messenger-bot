import config from '../../config.json' with { type: 'json' };

export function isOwner(userId: string): boolean {
  const envOwnerId = process.env.OWNER_ID;
  const configOwnerIds: string[] = (config.bot as any).ownerIds || [];
  const allOwnerIds = envOwnerId ? [envOwnerId, ...configOwnerIds] : configOwnerIds;
  return allOwnerIds.map(id => String(id).trim()).includes(String(userId).trim());
}

export function isInAdminList(userId: string): boolean {
  const configAdminIds: string[] = (config.bot as any).adminIds || [];
  return configAdminIds.map(id => String(id).trim()).includes(String(userId).trim());
}

export function isThreadAdmin(userId: string, threadAdminIds: string[]): boolean {
  const normalizedUserId = String(userId).trim();
  return threadAdminIds.map(id => String(id).trim()).includes(normalizedUserId);
}

export async function canExecuteOwnerCommand(userId: string): Promise<boolean> {
  return isOwner(userId);
}

export async function canExecuteAdminCommand(
  userId: string,
  api: any,
  threadId: string
): Promise<{ allowed: boolean; reason?: string }> {
  if (isOwner(userId)) {
    return { allowed: true };
  }

  const inAdminList = isInAdminList(userId);
  
  if (!inAdminList) {
    return { allowed: false, reason: 'not_in_admin_list' };
  }

  try {
    const threadInfo = await api.getThreadInfo(threadId);
    const threadAdminIds = (threadInfo?.adminIDs || []).map((a: any) => String(a.id || a).trim()).filter(Boolean);

    // panindigan-automate does not expose thread admin lists (`adminIDs` is
    // always empty). Fall back to the configured admin list when group admin
    // status cannot be verified. Owners are already allowed above.
    if (threadAdminIds.length === 0) {
      return { allowed: inAdminList, ...(inAdminList ? {} : { reason: 'cannot_verify_group_admin' }) };
    }

    const isGroupAdmin = isThreadAdmin(userId, threadAdminIds);

    if (!isGroupAdmin) {
      return { allowed: false, reason: 'not_group_admin' };
    }

    return { allowed: true };
  } catch (error) {
    return { allowed: inAdminList, ...(inAdminList ? {} : { reason: 'cannot_verify_group_admin' }) };
  }
}

export async function canAccessLockedGroup(
  userId: string,
  api: any,
  threadId: string
): Promise<boolean> {
  if (isOwner(userId)) {
    return true;
  }

  const inAdminList = isInAdminList(userId);
  if (!inAdminList) {
    try {
      const threadInfo = await api.getThreadInfo(threadId);
      const threadAdminIds = (threadInfo?.adminIDs || []).map((a: any) => String(a.id || a).trim()).filter(Boolean);
      // Automate cannot verify group admins (adminIDs is empty) → deny.
      return threadAdminIds.length > 0 && isThreadAdmin(userId, threadAdminIds);
    } catch {
      return false;
    }
  }

  try {
    const threadInfo = await api.getThreadInfo(threadId);
    const threadAdminIds = (threadInfo?.adminIDs || []).map((a: any) => String(a.id || a).trim()).filter(Boolean);
    // Automate cannot verify group admins (adminIDs is empty) →
    // trust the configured admin list.
    if (threadAdminIds.length === 0) return true;
    return isThreadAdmin(userId, threadAdminIds);
  } catch {
    return true; // In admin list but verification failed — locked groups stay usable by admins.
  }
}

export function getOwnerIds(): string[] {
  const envOwnerId = process.env.OWNER_ID;
  const configOwnerIds: string[] = (config.bot as any).ownerIds || [];
  return envOwnerId ? [envOwnerId, ...configOwnerIds] : configOwnerIds;
}

export function getAdminIds(): string[] {
  return (config.bot as any).adminIds || [];
}
