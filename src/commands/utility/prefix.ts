import type { Command, CommandContext } from '../../types/index.js';
import { safeGetThreadInfo } from '../../lib/apiHelpers.js';
import { isInAdminList } from '../../lib/permissions.js';
import config from '../../../config.json' with { type: 'json' };
import { database } from '../../database/index.js';

const command: Command = {
  name: 'prefix',
  aliases: ['px', 'setprefix', 'changeprefix'],
  description: 'Show or change the bot prefix for this group',
  category: 'utility',
  usage: 'prefix [new_prefix]',
  examples: ['prefix', 'prefix !', 'prefix ?', 'prefix Panindigan'],

  async execute(context: CommandContext): Promise<void> {
    const { args, reply, event, api } = context;
    
    const threadId = String(event.threadID);
    const senderId = String(event.senderID);
    const ownerId = process.env.OWNER_ID;
    
    const currentPrefix = await database.getSetting<string>(`prefix_${threadId}`) || config.bot.prefix;
    const defaultPrefix = config.bot.prefix;
    const isCustom = currentPrefix !== defaultPrefix;
    
    if (args.length === 0) {
      const statusIcon = isCustom ? '🔧' : '📌';
      const statusText = isCustom ? 'Custom' : 'Default';
      
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ⚙️ 𝗣𝗥𝗘𝗙𝗜𝗫 𝗦𝗘𝗧𝗧𝗜𝗡𝗚𝗦 ⚙️     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌─────────────────────────────┐
│ ${statusIcon} Status: ${statusText}
│ 📝 Current: ${currentPrefix}
│ 🔒 Default: ${defaultPrefix}
└─────────────────────────────┘

┌── 𝗘𝘅𝗮𝗺𝗽𝗹𝗲𝘀 ──┐
│ ${currentPrefix}help  ➜ Commands
│ ${currentPrefix}ping  ➜ Status
│ ${currentPrefix}about ➜ Bot Info
└────────────────────┘

┌──│ 𝗖𝗵𝗮𝗻𝗴𝗲 𝗣𝗿𝗲𝗳𝗶𝘅 ──┐
│ ${currentPrefix}prefix <new>
│ Example: ${currentPrefix}prefix !
│ Example: ${currentPrefix}prefix Panindigan
└─────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ Only admins can change prefix`);
      return;
    }
    
    const isOwner = ownerId && senderId === ownerId;
    
    let isAdmin = isInAdminList(senderId);
    if (!isAdmin) {
      try {
        const threadInfo = await safeGetThreadInfo(api, threadId);
        const adminIds = threadInfo.adminIDs?.map((a: any) => String(a.id)) || [];
        isAdmin = adminIds.includes(senderId);
      } catch (e) {}
    }
    
    if (!isOwner && !isAdmin) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ❌ 𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗 ❌     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🔒 Only group admins and bot owner can change the prefix.

📝 Current prefix: ${currentPrefix}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Ask an admin to change it for you`);
      return;
    }
    
    const newPrefix = args.join(' ');
    
    if (newPrefix.length > 10) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ❌ 𝗜𝗡𝗩𝗔𝗟𝗜𝗗 𝗣𝗥𝗘𝗙𝗜𝗫 ❌     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

⚠️ Prefix too long!
📏 Maximum: 10 characters
📝 Your input: ${newPrefix.length} characters

┌── 𝗦𝘂𝗴𝗴𝗲𝘀𝘁𝗶𝗼𝗻𝘀 ──┐
│ ! ? # $ %
│ Bot! Cmd!
│ > >> =>
└─────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Keep it short and simple`);
      return;
    }

    if (newPrefix.length === 0) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ❌ 𝗜𝗡𝗩𝗔𝗟𝗜𝗗 𝗣𝗥𝗘𝗙𝗜𝗫 ❌     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ Prefix cannot be empty!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Current prefix: ${currentPrefix}`);
      return;
    }
    
    await database.setSetting(`prefix_${threadId}`, newPrefix);
    
    await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ✅ 𝗣𝗥𝗘𝗙𝗜𝗫 𝗨𝗣𝗗𝗔𝗧𝗘𝗗 ✅     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌─────────────────────────────┐
│ 📌 Old: ${currentPrefix}
│ 📝 New: ${newPrefix}
└─────────────────────────────┘

┌── 𝗧𝗿𝘆 𝗶𝘁 𝗻𝗼𝘄 ──┐
│ ${newPrefix}help  ➜ Commands
│ ${newPrefix}ping  ➜ Status
│ ${newPrefix}about ➜ Bot Info
└────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ Old prefix "${currentPrefix}" no longer works
✨ Use "${newPrefix}" for all commands now`);
  }
};

export default command;
