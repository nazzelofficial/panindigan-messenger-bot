import type { Command, CommandContext } from '../../types/index.js';
import { BotLogger } from '../../lib/logger.js';
import { database } from '../../database/index.js';
import { decorations } from '../../lib/messageFormatter.js';

const command: Command = {
  name: 'autogreet',
  aliases: ['greet', 'dailygreet'],
  description: 'Toggle automatic time-based greetings (morning/afternoon/night)',
  category: 'admin',
  usage: 'autogreet <on|off>',
  examples: ['autogreet on', 'autogreet off'],
  adminOnly: true,
  cooldown: 5000,

  async execute(context: CommandContext): Promise<void> {
    const { event, args, reply, prefix } = context;
    
    const option = args[0]?.toLowerCase();
    
    const greetKey = `autogreet_${event.threadId}`;
    const currentSetting = await database.getSetting<string>(greetKey);
    const isEnabled = currentSetting === 'true';
    
    if (!option || !['on', 'off'].includes(option)) {
      await reply(`🌅 『 AUTO GREET 』 🌅
═══════════════════════════
${decorations.fire} Time-Based Greetings
═══════════════════════════

◈ CURRENT STATUS
═══════════════════════════
➤ Auto Greet: ${isEnabled ? '🟢 ON' : '🔴 OFF'}

◈ USAGE
═══════════════════════════
➤ ${prefix}autogreet on
➤ ${prefix}autogreet off

◈ FEATURES
═══════════════════════════
🌅 Good Morning (6 AM)
☀️ Good Afternoon (12 PM)
🌙 Good Night (9 PM)`);
      return;
    }
    
    const enable = option === 'on';
    
    try {
      await database.setSetting(greetKey, String(enable));
      
      BotLogger.info(`Auto-greet ${enable ? 'enabled' : 'disabled'} for group ${event.threadId}`);
      
      await reply(`🌅 『 AUTO GREET ${enable ? 'ENABLED' : 'DISABLED'} 』 🌅
═══════════════════════════
${decorations.fire} Setting Updated
═══════════════════════════

◈ STATUS
═══════════════════════════
➤ Auto Greet: ${enable ? '🟢 ON' : '🔴 OFF'}

◈ SCHEDULE
═══════════════════════════
🌅 Morning: 6:00 AM
☀️ Afternoon: 12:00 PM
🌙 Night: 9:00 PM

═══════════════════════════
${enable ? '✅ Time-based greetings enabled' : '⚠️ Auto greetings disabled'}`);
    } catch (err) {
      BotLogger.error('Failed to toggle auto-greet', err);
      await reply(`${decorations.fire} 『 ERROR 』
═══════════════════════════
❌ Failed to update setting`);
    }
  }
};

export default command;
