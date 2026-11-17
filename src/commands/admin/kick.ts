import type { Command, CommandContext } from '../../types/index.js';
import { BotLogger } from '../../lib/logger.js';
import { safeGetThreadInfo, safeGetUserInfo, botGroupAdminStatus } from '../../lib/apiHelpers.js';

const command: Command = {
  name: 'kick',
  aliases: ['boot'],
  description: 'Kick a member from the group chat',
  category: 'admin',
  usage: 'kick <@mention|userId>',
  examples: ['kick @user', 'kick 123456789'],
  adminOnly: true,
  cooldown: 5000,

  async execute(context: CommandContext): Promise<void> {
    const { api, event, args, reply, prefix } = context;
    const threadId = String(event.threadId);
    const botId = String(api.getSession().userId);
    
    let targetId: string | null = null;
    
    if (event.mentions && Object.keys(event.mentions).length > 0) {
      targetId = String(Object.keys(event.mentions)[0]).trim();
    } else if (args[0] && /^\d+$/.test(args[0])) {
      targetId = String(args[0]).trim();
    }
    
    if (!targetId) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━┓
┃  🔨 KICK USER
┗━━━━━━━━━━━━━━━━━━━━━┛

Kick a member from the group.

📝 Usage: ${prefix}kick @user
📝 Usage: ${prefix}kick <userId>`);
      return;
    }
    
    if (targetId === String(event.senderId)) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━┓
┃  ❌ DENIED
┗━━━━━━━━━━━━━━━━━━━┛
You cannot kick yourself!`);
      return;
    }

    if (targetId === botId) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━┓
┃  ❌ DENIED
┗━━━━━━━━━━━━━━━━━━━┛
Cannot kick the bot itself!
Use ${prefix}leave instead.`);
      return;
    }
    
    try {
      const threadInfo = await safeGetThreadInfo(api, threadId);
      
      if (!threadInfo) {
        await reply(`┏━━━━━━━━━━━━━━━━━━━┓
┃  ❌ ERROR
┗━━━━━━━━━━━━━━━━━━━┛
Unable to fetch group info. Please try again.`);
        return;
      }
      
      const isBotAdmin = botGroupAdminStatus(threadInfo, botId);
      if (isBotAdmin === false) {
        await reply(`┏━━━━━━━━━━━━━━━━━━━━━┓
┃  ❌ NO PERMISSION
┗━━━━━━━━━━━━━━━━━━━━━┛
Bot must be admin to kick members.
Please make bot admin first.`);
        return;
      }
      // null → admin list unavailable (panindigan-automate): proceed, Facebook enforces permissions

      const userInfo = await safeGetUserInfo(api, targetId);
      const userName = userInfo[targetId]?.name || 'Unknown User';
      
      await api.removeParticipant(threadId, targetId);
      
      const timestamp = new Date().toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      
      BotLogger.info(`Kicked user ${targetId} (${userName}) from group ${threadId}`);
      
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━┓
┃  ✅ USER KICKED
┗━━━━━━━━━━━━━━━━━━━━━┛

👤 Name: ${userName}
🆔 ID: ${targetId}
⏰ Time: ${timestamp}

Successfully removed from group!`);
    } catch (err: any) {
      BotLogger.error(`Failed to kick user ${targetId}`, err);
      
      let errorMsg = 'Failed to remove user.';
      if (err?.message?.includes('admin')) {
        errorMsg = 'Cannot kick group admin.';
      } else if (err?.message?.includes('permission')) {
        errorMsg = 'Bot lacks admin permission.';
      }
      
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━┓
┃  ❌ KICK FAILED
┗━━━━━━━━━━━━━━━━━━━━━┛

${errorMsg}

Possible reasons:
• User is a group admin
• User already left
• Bot is not admin`);
    }
  }
};

export default command;
