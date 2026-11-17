import type { Command } from '../../types/index.js';
import { database } from '../../database/index.js';
import { safeGetUserInfo } from '../../lib/apiHelpers.js';
import { BotLogger } from '../../lib/logger.js';

export const command: Command = {
  name: 'unban',
  aliases: ['unblock', 'whitelist', 'pardon'],
  description: 'Unban a user from bot commands',
  category: 'admin',
  usage: 'unban <user ID>',
  examples: ['unban 123456789'],
  cooldown: 5000,
  adminOnly: true,

  async execute({ api, event, args, reply, prefix }): Promise<void> {
    if (!args[0]) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━┓
┃  🔓 UNBAN USER
┗━━━━━━━━━━━━━━━━━━━━━┛

Remove a ban from a user.

📝 Usage: ${prefix}unban <userId>
📝 Example: ${prefix}unban 100012345678901`);
      return;
    }

    const targetId = String(args[0].replace(/[^0-9]/g, ''));

    if (!targetId || targetId.length < 5) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━┓
┃  ❌ ERROR
┗━━━━━━━━━━━━━━━━━━━┛
Invalid user ID. Please provide a valid Facebook user ID.`);
      return;
    }

    try {
      const banData = await database.getSetting(`banned_${targetId}`);
      
      if (!banData) {
        await reply(`┏━━━━━━━━━━━━━━━━━━━┓
┃  ℹ️ INFO
┗━━━━━━━━━━━━━━━━━━━┛
This user is not banned.`);
        return;
      }

      const userInfo = await safeGetUserInfo(api, targetId);
      const userName = userInfo[targetId]?.name || 'Unknown User';

      await database.deleteSetting(`banned_${targetId}`);

      const timestamp = new Date().toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      BotLogger.info(`Unbanned user ${targetId} (${userName}) by ${event.senderId}`);

      await reply(`┏━━━━━━━━━━━━━━━━━━━━━┓
┃  ✅ USER UNBANNED
┗━━━━━━━━━━━━━━━━━━━━━┛

👤 Name: ${userName}
🆔 ID: ${targetId}
⏰ Time: ${timestamp}
✅ Status: UNBANNED

User can now use bot commands again.`);
    } catch (error) {
      BotLogger.error('Failed to unban user', error);
      await reply(`┏━━━━━━━━━━━━━━━━━━━┓
┃  ❌ ERROR
┗━━━━━━━━━━━━━━━━━━━┛
Failed to unban user. Please try again.`);
    }
  },
};

export default command;
