import type { Command, CommandContext } from '../../types/index.js';
import { badWordsFilter } from '../../lib/badwords.js';

const command: Command = {
  name: 'antiswear',
  aliases: ['badwords', 'profanity', 'swearfilter'],
  description: 'Toggle anti-swear/profanity filter',
  category: 'admin',
  usage: 'antiswear <on/off>',
  examples: ['antiswear on', 'antiswear off'],
  cooldown: 5000,
  adminOnly: true,

  async execute(context: CommandContext): Promise<void> {
    const { args, reply, event, prefix } = context;
    const threadId = event.threadID;

    if (args.length === 0) {
      const settings = await badWordsFilter.getSettings(threadId);
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     🤬 𝗔𝗡𝗧𝗜-𝗦𝗪𝗘𝗔𝗥 🤬     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

📊 𝗖𝘂𝗿𝗿𝗲𝗻𝘁 𝗦𝘁𝗮𝘁𝘂𝘀: ${settings.badWordsEnabled ? '🟢 ON' : '🔴 OFF'}

📝 𝗨𝘀𝗮𝗴𝗲:
• ${prefix}antiswear on
• ${prefix}antiswear off

💡 When enabled:
• Filters profanity/swear words
• Auto-deletes offensive messages
• Warns users

━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ Moderation Settings`);
      return;
    }

    const mode = args[0].toLowerCase();
    
    if (mode !== 'on' && mode !== 'off') {
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ❌ 𝗜𝗡𝗩𝗔𝗟𝗜𝗗 ❌     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

⚠️ Please use 'on' or 'off'

━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      return;
    }

    const enabled = mode === 'on';
    await badWordsFilter.updateSettings({ badWordsEnabled: enabled }, threadId);

    await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     🤬 𝗔𝗡𝗧𝗜-𝗦𝗪𝗘𝗔𝗥 🤬     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

${enabled ? '✅' : '❌'} Anti-swear ${enabled ? 'enabled' : 'disabled'}!

┌────────────────────────┐
│ 🔒 Status: ${enabled ? 'ACTIVE' : 'INACTIVE'}
│ 🤬 Filter: ${enabled ? 'Enabled' : 'Disabled'}
│ ⚠️ Warnings: ${enabled ? 'Auto' : 'Off'}
└────────────────────────┘

${enabled ? '💡 Swear words will be filtered' : '💡 Swear filter is now off'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ Moderation Settings`);
  }
};

export default command;
