import type { Command, CommandContext } from '../../types/index.js';
import { BotLogger } from '../../lib/logger.js';
import { database } from '../../database/index.js';
import { decorations } from '../../lib/messageFormatter.js';

const command: Command = {
  name: 'slowmode',
  aliases: ['slow', 'cooldowngc'],
  description: 'Set slowmode for the group (delay between messages)',
  category: 'admin',
  usage: 'slowmode <seconds|off>',
  examples: ['slowmode 10', 'slowmode 30', 'slowmode off'],
  adminOnly: true,
  cooldown: 5000,

  async execute(context: CommandContext): Promise<void> {
    const { event, args, reply, prefix } = context;
    
    if (args.length === 0) {
      const slowmodeKey = `slowmode_${event.threadId}`;
      const currentSetting = await database.getSetting<string>(slowmodeKey);
      const current = currentSetting ? parseInt(currentSetting) : 0;
      
      await reply(`🐌 『 SLOWMODE 』 🐌
═══════════════════════════
${decorations.fire} Message Rate Limit
═══════════════════════════

◈ CURRENT STATUS
═══════════════════════════
➤ Delay: ${current > 0 ? `${current} seconds` : 'OFF'}

◈ USAGE
═══════════════════════════
➤ ${prefix}slowmode <seconds>
➤ ${prefix}slowmode off

◈ EXAMPLE
═══════════════════════════
➤ ${prefix}slowmode 10
➤ ${prefix}slowmode 30
➤ ${prefix}slowmode off`);
      return;
    }
    
    const arg = args[0].toLowerCase();
    
    try {
      const slowmodeKey = `slowmode_${event.threadId}`;
      
      if (arg === 'off' || arg === '0') {
        await database.deleteSetting(slowmodeKey);
        
        BotLogger.info(`Disabled slowmode for group ${event.threadId}`);
        
        await reply(`🐌 『 SLOWMODE DISABLED 』 🐌
═══════════════════════════
${decorations.fire} Setting Updated
═══════════════════════════

◈ STATUS
═══════════════════════════
➤ Slowmode: OFF
➤ Message Delay: None

═══════════════════════════
${decorations.sparkle} Members can chat freely!`);
        return;
      }
      
      const seconds = parseInt(arg);
      
      if (isNaN(seconds) || seconds < 1 || seconds > 3600) {
        await reply(`${decorations.fire} 『 ERROR 』
═══════════════════════════
❌ Invalid duration
💡 Use 1-3600 seconds or "off"`);
        return;
      }
      
      await database.setSetting(slowmodeKey, String(seconds));
      
      const timestamp = new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Manila',
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      
      BotLogger.info(`Set slowmode to ${seconds}s for group ${event.threadId}`);
      
      await reply(`🐌 『 SLOWMODE ENABLED 』 🐌
═══════════════════════════
${decorations.fire} Setting Updated
═══════════════════════════

◈ STATUS
═══════════════════════════
➤ Slowmode: ON
➤ Delay: ${seconds} second${seconds > 1 ? 's' : ''}
⏰ Set At: ${timestamp}

◈ NOTE
═══════════════════════════
Members must wait ${seconds}s
between bot commands.

═══════════════════════════
💡 Use ${prefix}slowmode off to disable`);
    } catch (err) {
      BotLogger.error(`Failed to set slowmode for group ${event.threadId}`, err);
      await reply(`${decorations.fire} 『 ERROR 』
═══════════════════════════
❌ Failed to set slowmode`);
    }
  }
};

export default command;
