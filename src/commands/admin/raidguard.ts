import type { Command, CommandContext } from '../../types/index.js';
import { database } from '../../database/index.js';

const command: Command = {
  name: 'raidguard',
  aliases: ['raidprotect', 'antiraid', 'raidshield'],
  description: 'Toggle raid protection for the group',
  category: 'admin',
  usage: 'raidguard <on/off>',
  examples: ['raidguard on', 'raidguard off'],
  cooldown: 5000,
  adminOnly: true,

  async execute(context: CommandContext): Promise<void> {
    const { args, reply, event, prefix } = context;
    const threadId = event.threadId;

    if (args.length === 0) {
      const current = await database.getSetting<boolean>(`raidguard_${threadId}`) || false;
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     🛡️ 𝗥𝗔𝗜𝗗 𝗚𝗨𝗔𝗥𝗗 🛡️     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

📊 𝗖𝘂𝗿𝗿𝗲𝗻𝘁 𝗦𝘁𝗮𝘁𝘂𝘀: ${current ? '🟢 ON' : '🔴 OFF'}

📝 𝗨𝘀𝗮𝗴𝗲:
• ${prefix}raidguard on
• ${prefix}raidguard off

💡 When enabled:
• Detects mass joins
• Blocks suspicious accounts
• Auto-kicks raid bots
• Protects group from attacks

━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ Security Settings`);
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
    await database.setSetting(`raidguard_${threadId}`, enabled);

    await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     🛡️ 𝗥𝗔𝗜𝗗 𝗚𝗨𝗔𝗥𝗗 🛡️     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

${enabled ? '✅' : '❌'} Raid guard ${enabled ? 'enabled' : 'disabled'}!

┌────────────────────────┐
│ 🛡️ Status: ${enabled ? 'ACTIVE' : 'INACTIVE'}
│ 🚨 Detection: ${enabled ? 'Enabled' : 'Disabled'}
│ 🔒 Protection: ${enabled ? 'Full' : 'None'}
└────────────────────────┘

${enabled ? '💡 Group is now protected from raids' : '💡 Raid protection is now off'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ Security Settings`);
  }
};

export default command;
