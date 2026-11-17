import type { Command, CommandContext } from '../../types/index.js';
import { badWordsFilter } from '../../lib/badwords.js';

const command: Command = {
  name: 'antitoxic',
  aliases: ['antibadword', 'blocktoxic', 'toxicfilter'],
  description: 'Block all inappropriate/toxic words in the group',
  category: 'admin',
  usage: 'antitoxic <on/off>',
  examples: ['antitoxic on', 'antitoxic off'],
  cooldown: 5000,
  adminOnly: true,

  async execute(context: CommandContext): Promise<void> {
    const { args, reply, event, prefix } = context;
    const threadId = event.threadId;

    if (args.length === 0) {
      const settings = await badWordsFilter.getSettings(threadId);
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ☣️ 𝗔𝗡𝗧𝗜-𝗧𝗢𝗫𝗜𝗖 ☣️     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

📊 𝗖𝘂𝗿𝗿𝗲𝗻𝘁 𝗦𝘁𝗮𝘁𝘂𝘀: ${settings.badWordsEnabled ? '🟢 ON' : '🔴 OFF'}

📝 𝗨𝘀𝗮𝗴𝗲:
• ${prefix}antitoxic on
• ${prefix}antitoxic off

💡 When enabled:
• Blocks profanity & toxic words
• Warns users automatically
• Auto-deletes toxic messages

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ Powered by BadWordsFilter`);
      return;
    }

    const mode = args[0].toLowerCase();
    
    if (mode === 'on') {
      await badWordsFilter.updateSettings({ badWordsEnabled: true }, threadId);
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ☣️ 𝗔𝗡𝗧𝗜-𝗧𝗢𝗫𝗜𝗖 ☣️     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

✅ Anti-Toxic Mode: 🟢 ENABLED

┌────────────────────────┐
│ 🔒 Status: ACTIVE
│ 🤬 Bad Words: BLOCKED
│ 🛡️ Protection: MAX
└────────────────────────┘

💡 All inappropriate words will now be blocked.
`);
    } else if (mode === 'off') {
      await badWordsFilter.updateSettings({ badWordsEnabled: false }, threadId);
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ☣️ 𝗔𝗡𝗧𝗜-𝗧𝗢𝗫𝗜𝗖 ☣️     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

✅ Anti-Toxic Mode: 🔴 DISABLED

┌────────────────────────┐
│ 🔓 Status: INACTIVE
│ 🤬 Bad Words: ALLOWED
│ ⚠️ Protection: OFF
└────────────────────────┘
`);
    } else {
      await reply(`⚠️ Usage: ${prefix}antitoxic <on/off>`);
    }
  }
};

export default command;
