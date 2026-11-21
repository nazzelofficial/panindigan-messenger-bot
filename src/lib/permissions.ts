import config from '../../config.json' with { type: 'json' };
import type { MessengerClient } from 'panindigan-automate';
import { safeGetThreadInfo } from './apiHelpers.js';

/** Reads the live group admin list from the modern client's ThreadInfo. */
async function threadAdminIds(client: MessengerClient, threadId: string): Promise<string[]> {
  try {
    const info = await safeGetThreadInfo(client, threadId);
    return (info?.adminIDs ?? []).map((a: any) => String(a?.id ?? a ?? '').trim()).filter(Boolean);
  } catch {
    return [];
  }
}

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
  client: import('panindigan-automate').MessengerClient,
  threadId: string
): Promise<{ allowed: boolean; reason?: string }> {
  if (isOwner(userId) || isInAdminList(userId)) {
    return { allowed: true };
  }
  // Modern client now exposes the live group admin list. A real group admin
  // can run admin commands even when not in the configured bot admin list.
  if (threadId && await isThreadAdmin(userId, await threadAdminIds(client, threadId))) {
    return { allowed: true };
  }
  return { allowed: false, reason: 'not_in_admin_list' };
}

export async function canAccessLockedGroup(
  userId: string,
  client: import('panindigan-automate').MessengerClient,
  threadId: string
): Promise<boolean> {
  if (isOwner(userId) || isInAdminList(userId)) {
    return true;
  }
  if (threadId && await isThreadAdmin(userId, await threadAdminIds(client, threadId))) {
    return true;
  }
  return false;
}

export function getOwnerIds(): string[] {
  const envOwnerId = process.env.OWNER_ID;
  const configOwnerIds: string[] = (config.bot as any).ownerIds || [];
  return envOwnerId ? [envOwnerId, ...configOwnerIds] : configOwnerIds;
}

export function getAdminIds(): string[] {
  return (config.bot as any).adminIds || [];
}
