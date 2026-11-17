import type { Command, CommandContext } from '../../types/index.js';
import { database } from '../../database/index.js';

const command: Command = {
  name: 'blocktagall',
  aliases: ['antitagall', 'notagall', 'tagallblock'],
  description: 'Block @everyone/@all tag spam',
  category: 'admin',
  usage: 'blocktagall <on/off>',
  examples: ['blocktagall on', 'blocktagall off'],
  cooldown: 5000,
  adminOnly: true,

  async execute(context: CommandContext): Promise<void> {
    const { args, reply, event, prefix } = context;
    const threadId = event.threadId;

    if (args.length === 0) {
      const current = await database.getSetting<boolean>(`blocktagall_${threadId}`) || false;
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     📢 𝗕𝗟𝗢𝗖𝗞 𝗧𝗔𝗚 𝗔𝗟𝗟 📢     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

📊 𝗖𝘂𝗿𝗿𝗲𝗻𝘁 𝗦𝘁𝗮𝘁𝘂𝘀: ${current ? '🟢 ON' : '🔴 OFF'}

📝 𝗨𝘀𝗮𝗴𝗲:
• ${prefix}blocktagall on
• ${prefix}blocktagall off

💡 When enabled:
• Blocks @everyone mentions
• Prevents mass tag spam
• Only admins can tag all

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
    await database.setSetting(`blocktagall_${threadId}`, enabled);

    await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     📢 𝗕𝗟𝗢𝗖𝗞 𝗧𝗔𝗚 𝗔𝗟𝗟 📢     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

${enabled ? '✅' : '❌'} Tag-all blocker ${enabled ? 'enabled' : 'disabled'}!

┌────────────────────────┐
│ 📢 Status: ${enabled ? 'ACTIVE' : 'INACTIVE'}
│ 🔍 Detection: ${enabled ? 'Enabled' : 'Disabled'}
│ 🚫 Auto-delete: ${enabled ? 'Yes' : 'No'}
└────────────────────────┘

${enabled ? '💡 Mass tag spam will be blocked' : '💡 Tag-all blocker is now off'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ Moderation Settings`);
  }
};

export default command;
