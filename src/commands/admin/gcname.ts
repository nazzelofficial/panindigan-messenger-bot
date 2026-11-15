import type { Command, CommandContext } from '../../types/index.js';
import { BotLogger } from '../../lib/logger.js';
import { safeGetThreadInfo, botGroupAdminStatus } from '../../lib/apiHelpers.js';

const command: Command = {
  name: 'gcname',
  aliases: ['groupname', 'setgcname', 'rename'],
  description: 'Change the group chat name',
  category: 'admin',
  usage: 'gcname <new name>',
  examples: ['gcname My Awesome Group', 'gcname Family Chat'],
  adminOnly: true,
  cooldown: 10000,

  async execute(context: CommandContext): Promise<void> {
    const { api, event, args, reply, prefix } = context;
    const threadId = String(event.threadID);
    const botId = String(api.getCurrentUserID());

    const newName = args.join(' ').trim();

    if (!newName) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━┓
┃  ✏️ CHANGE GC NAME
┗━━━━━━━━━━━━━━━━━━━━━┛

Change the group chat name.

📝 Usage: ${prefix}gcname <new name>
📝 Example: ${prefix}gcname Best Friends Forever`);
      return;
    }

    if (newName.length > 250) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━┓
┃  ❌ ERROR
┗━━━━━━━━━━━━━━━━━━━┛
Group name is too long! Maximum 250 characters.`);
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
      
      const oldName = threadInfo.threadName || 'Unknown';

      const isBotAdmin = botGroupAdminStatus(threadInfo, botId);
      if (isBotAdmin === false) {
        await reply(`┏━━━━━━━━━━━━━━━━━━━━━┓
┃  ❌ NO PERMISSION
┗━━━━━━━━━━━━━━━━━━━━━┛
Bot must be admin to change group name.`);
        return;
      }
      // null → admin list unavailable (panindigan-automate): proceed, Facebook enforces permissions

      await api.setTitle(newName, threadId);

      const timestamp = new Date().toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      BotLogger.info(`Changed group name from "${oldName}" to "${newName}" in ${threadId}`);

      await reply(`┏━━━━━━━━━━━━━━━━━━━━━┓
┃  ✅ NAME CHANGED
┗━━━━━━━━━━━━━━━━━━━━━┛

📛 Old Name: ${oldName}
📛 New Name: ${newName}
⏰ Time: ${timestamp}`);
    } catch (err: any) {
      BotLogger.error(`Failed to change group name`, err);
      
      let errorMsg = 'Failed to change group name.';
      if (err?.message?.includes('permission')) {
        errorMsg = 'Bot lacks permission to change group name.';
      }
      
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━┓
┃  ❌ FAILED
┗━━━━━━━━━━━━━━━━━━━━━┛

${errorMsg}

Bot must be admin to change the group name.`);
    }
  }
};

export default command;
