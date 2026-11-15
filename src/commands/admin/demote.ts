import type { Command, CommandContext } from '../../types/index.js';
import { BotLogger } from '../../lib/logger.js';
import { safeGetThreadInfo, safeGetUserInfo, botGroupAdminStatus } from '../../lib/apiHelpers.js';

const command: Command = {
  name: 'demote',
  aliases: ['removeadmin', 'unadmin'],
  description: 'Remove admin status from a user',
  category: 'admin',
  usage: 'demote <@mention|userID>',
  examples: ['demote @user', 'demote 123456789'],
  adminOnly: true,
  cooldown: 5000,

  async execute(context: CommandContext): Promise<void> {
    const { api, event, args, reply, prefix } = context;
    const threadId = String(event.threadID);
    const botId = String(api.getCurrentUserID());

    let targetId: string | null = null;

    if (event.mentions && Object.keys(event.mentions).length > 0) {
      targetId = String(Object.keys(event.mentions)[0]).trim();
    } else if (args[0] && /^\d+$/.test(args[0])) {
      targetId = String(args[0]).trim();
    }

    if (!targetId) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━┓
┃  👎 DEMOTE USER
┗━━━━━━━━━━━━━━━━━━━━━┛

Remove admin status from a user.

📝 Usage: ${prefix}demote @user
📝 Usage: ${prefix}demote <userID>`);
      return;
    }

    if (targetId === botId) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━┓
┃  ❌ DENIED
┗━━━━━━━━━━━━━━━━━━━┛
Cannot demote the bot itself!`);
      return;
    }

    try {
      const threadInfo = await safeGetThreadInfo(api, threadId);
      
      if (!threadInfo) {
        await reply(`┏━━━━━━━━━━━━━━━━━━━┓
┃  ❌ ERROR
┗━━━━━━━━━━━━━━━━━━━┛
Could not fetch group info. Please try again.`);
        return;
      }
      
      const adminIDs = (threadInfo.adminIDs || []).map((a: any) => String(a.id || a));
      const participantIDs = (threadInfo.participantIDs || []).map((id: any) => String(id));

      const isBotAdmin = botGroupAdminStatus(threadInfo, botId);
      if (isBotAdmin === false) {
        await reply(`┏━━━━━━━━━━━━━━━━━━━━━┓
┃  ❌ NO PERMISSION
┗━━━━━━━━━━━━━━━━━━━━━┛
Bot must be admin to demote users.`);
        return;
      }
      // null → admin list unavailable (panindigan-automate): proceed, Facebook enforces permissions

      if (!participantIDs.includes(targetId)) {
        await reply(`┏━━━━━━━━━━━━━━━━━━━┓
┃  ❌ ERROR
┗━━━━━━━━━━━━━━━━━━━┛
User is not in this group.`);
        return;
      }

      if (adminIDs.length > 0 && !adminIDs.includes(targetId)) {
        await reply(`┏━━━━━━━━━━━━━━━━━━━┓
┃  ℹ️ INFO
┗━━━━━━━━━━━━━━━━━━━┛
This user is not an admin.`);
        return;
      }

      const userInfo = await safeGetUserInfo(api, targetId);
      const userName = userInfo[targetId]?.name || 'Unknown User';

      await api.changeAdminStatus(threadId, targetId, false);

      const timestamp = new Date().toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      BotLogger.info(`Demoted ${targetId} (${userName}) from admin in ${threadId}`);

      await reply(`┏━━━━━━━━━━━━━━━━━━━━━┓
┃  👎 USER DEMOTED
┗━━━━━━━━━━━━━━━━━━━━━┛

👤 Name: ${userName}
🆔 ID: ${targetId}
⏰ Time: ${timestamp}

User is no longer a group admin.`);
    } catch (err: any) {
      BotLogger.error(`Failed to demote user ${targetId}`, err);
      
      let errorMsg = 'Failed to demote user.';
      if (err?.message?.includes('permission')) {
        errorMsg = 'Bot lacks permission to demote users.';
      } else if (err?.message?.includes('creator')) {
        errorMsg = 'Cannot demote group creator.';
      }
      
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━┓
┃  ❌ DEMOTE FAILED
┗━━━━━━━━━━━━━━━━━━━━━┛

${errorMsg}

Possible reasons:
• User is group creator
• Bot is not admin
• Cannot demote group creator`);
    }
  }
};

export default command;
