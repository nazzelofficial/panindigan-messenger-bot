import type { Command, CommandContext } from '../../types/index.js';
import { BotLogger } from '../../lib/logger.js';
import { database } from '../../database/index.js';
import { decorations } from '../../lib/messageFormatter.js';

const command: Command = {
  name: 'autogoodbye',
  aliases: ['goodbye', 'byemsg', 'leavemsg'],
  description: 'Toggle automatic goodbye messages for leaving members',
  category: 'admin',
  usage: 'autogoodbye <on|off>',
  examples: ['autogoodbye on', 'autogoodbye off'],
  adminOnly: true,
  cooldown: 5000,

  async execute(context: CommandContext): Promise<void> {
    const { event, args, reply, prefix } = context;
    
    const option = args[0]?.toLowerCase();
    
    const goodbyeKey = `autogoodbye_${event.threadId}`;
    const currentSetting = await database.getSetting<string>(goodbyeKey);
    const isEnabled = currentSetting !== 'false';
    
    if (!option || !['on', 'off'].includes(option)) {
      await reply(`👋 『 AUTO GOODBYE 』 👋
═══════════════════════════
${decorations.fire} Goodbye Messages
═══════════════════════════

◈ CURRENT STATUS
═══════════════════════════
➤ Auto Goodbye: ${isEnabled ? '🟢 ON' : '🔴 OFF'}

◈ USAGE
═══════════════════════════
➤ ${prefix}autogoodbye on
➤ ${prefix}autogoodbye off

◈ FEATURES
═══════════════════════════
• Farewell leaving members
• Show member stats
• Display updated count`);
      return;
    }
    
    const enable = option === 'on';
    
    try {
      await database.setSetting(goodbyeKey, String(enable));
      
      BotLogger.info(`Auto-goodbye ${enable ? 'enabled' : 'disabled'} for group ${event.threadId}`);
      
      await reply(`👋 『 AUTO GOODBYE ${enable ? 'ENABLED' : 'DISABLED'} 』 👋
═══════════════════════════
${decorations.fire} Setting Updated
═══════════════════════════

◈ STATUS
═══════════════════════════
➤ Auto Goodbye: ${enable ? '🟢 ON' : '🔴 OFF'}

═══════════════════════════
${enable ? '✅ Leaving members will get farewell' : '⚠️ Goodbye messages disabled'}`);
    } catch (err) {
      BotLogger.error('Failed to toggle auto-goodbye', err);
      await reply(`${decorations.fire} 『 ERROR 』
═══════════════════════════
❌ Failed to update setting`);
    }
  }
};

export default command;
