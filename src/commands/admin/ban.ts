import type { Command } from '../../types/index.js';
import { database } from '../../database/index.js';
import { safeGetUserInfo } from '../../lib/apiHelpers.js';
import { BotLogger } from '../../lib/logger.js';

export const command: Command = {
  name: 'ban',
  aliases: ['block', 'blacklist', 'botban'],
  description: 'Ban a user from using bot commands',
  category: 'admin',
  usage: 'ban <@mention or user ID> [reason]',
  examples: ['ban @user Spamming', 'ban 123456789 Breaking rules'],
  cooldown: 5000,
  adminOnly: true,

  async execute({ api, event, args, reply, prefix }): Promise<void> {
    if (!args[0]) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━┓
┃  🔨 BAN USER
┗━━━━━━━━━━━━━━━━━━━━━┛

Ban a user from using bot commands.

📝 Usage:
• ${prefix}ban @user [reason]
• ${prefix}ban <userId> [reason]

📝 Example:
• ${prefix}ban @user Spamming commands`);
      return;
    }

    let targetId = String(args[0].replace(/[^0-9]/g, ''));
    
    if (event.messageReply) {
      targetId = String(event.messageReply.senderId);
    } else if (event.mentions && Object.keys(event.mentions).length > 0) {
      targetId = String(Object.keys(event.mentions)[0]);
    }

    if (!targetId || targetId.length < 5) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━┓
┃  ❌ ERROR
┗━━━━━━━━━━━━━━━━━━━┛
Could not find user to ban. Please mention or provide valid ID.`);
      return;
    }

    const senderId = String(event.senderId);
    
    if (targetId === senderId) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━┓
┃  ❌ DENIED
┗━━━━━━━━━━━━━━━━━━━┛
You cannot ban yourself!`);
      return;
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';
    
    const timestamp = new Date().toLocaleString('en-PH', {
      timeZone: 'Asia/Manila',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    try {
      const userInfo = await safeGetUserInfo(api, targetId);
      const userName = userInfo[targetId]?.name || 'Unknown User';

      await database.setSetting(`banned_${targetId}`, JSON.stringify({
        bannedBy: senderId,
        reason,
        timestamp: new Date().toISOString(),
      }));

      BotLogger.info(`Banned user ${targetId} (${userName}) by ${senderId} - Reason: ${reason}`);

      await reply(`┏━━━━━━━━━━━━━━━━━━━━━┓
┃  🔨 USER BANNED
┗━━━━━━━━━━━━━━━━━━━━━┛

👤 Name: ${userName}
🆔 ID: ${targetId}
📝 Reason: ${reason}
⏰ Time: ${timestamp}
🚫 Status: BANNED

━━━━━━━━━━━━━━━━━━━━━
User can no longer use bot commands.
💡 Use ${prefix}unban ${targetId} to remove ban.`);
    } catch (error) {
      BotLogger.error('Failed to ban user', error);
      await reply(`┏━━━━━━━━━━━━━━━━━━━┓
┃  ❌ BAN FAILED
┗━━━━━━━━━━━━━━━━━━━┛
Failed to ban user. Please try again.`);
    }
  },
};

export default command;
