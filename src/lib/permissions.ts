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
  _client: import('panindigan-automate').MessengerClient,
  _threadId: string
): Promise<{ allowed: boolean; reason?: string }> {
  // Panindigan Automate does not expose thread admin lists; the configured
  // admin list (and owner ids) is the decision source.
  if (isOwner(userId)) {
    return { allowed: true };
  }

  const inAdminList = isInAdminList(userId);
  if (!inAdminList) {
    return { allowed: false, reason: 'not_in_admin_list' };
  }
  return { allowed: true };
}

export async function canAccessLockedGroup(
  userId: string,
  _client: import('panindigan-automate').MessengerClient,
  _threadId: string
): Promise<boolean> {
  // Panindigan Automate does not expose thread admin lists; a configured
  // admin or owner passes, everyone else is denied.
  if (isOwner(userId)) {
    return true;
  }
  return isInAdminList(userId);
}

export function getOwnerIds(): string[] {
  const envOwnerId = process.env.OWNER_ID;
  const configOwnerIds: string[] = (config.bot as any).ownerIds || [];
  return envOwnerId ? [envOwnerId, ...configOwnerIds] : configOwnerIds;
}

export function getAdminIds(): string[] {
  return (config.bot as any).adminIds || [];
}
