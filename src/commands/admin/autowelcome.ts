import type { Command, CommandContext } from '../../types/index.js';
import { BotLogger } from '../../lib/logger.js';
import { database } from '../../database/index.js';
import { decorations } from '../../lib/messageFormatter.js';

const command: Command = {
  name: 'autowelcome',
  aliases: ['welcome', 'welcomemsg'],
  description: 'Toggle automatic welcome messages for new members',
  category: 'admin',
  usage: 'autowelcome <on|off>',
  examples: ['autowelcome on', 'autowelcome off'],
  adminOnly: true,
  cooldown: 5000,

  async execute(context: CommandContext): Promise<void> {
    const { event, args, reply, prefix } = context;
    
    const option = args[0]?.toLowerCase();
    
    const welcomeKey = `autowelcome_${event.threadId}`;
    const currentSetting = await database.getSetting<string>(welcomeKey);
    const isEnabled = currentSetting !== 'false';
    
    if (!option || !['on', 'off'].includes(option)) {
      await reply(`👋 『 AUTO WELCOME 』 👋
═══════════════════════════
${decorations.fire} Welcome Messages
═══════════════════════════

◈ CURRENT STATUS
═══════════════════════════
➤ Auto Welcome: ${isEnabled ? '🟢 ON' : '🔴 OFF'}

◈ USAGE
═══════════════════════════
➤ ${prefix}autowelcome on
➤ ${prefix}autowelcome off

◈ FEATURES
═══════════════════════════
• Greet new members
• Show group info
• Display member count`);
      return;
    }
    
    const enable = option === 'on';
    
    try {
      await database.setSetting(welcomeKey, String(enable));
      
      BotLogger.info(`Auto-welcome ${enable ? 'enabled' : 'disabled'} for group ${event.threadId}`);
      
      await reply(`👋 『 AUTO WELCOME ${enable ? 'ENABLED' : 'DISABLED'} 』 👋
═══════════════════════════
${decorations.fire} Setting Updated
═══════════════════════════

◈ STATUS
═══════════════════════════
➤ Auto Welcome: ${enable ? '🟢 ON' : '🔴 OFF'}

═══════════════════════════
${enable ? '✅ New members will be welcomed' : '⚠️ Welcome messages disabled'}`);
    } catch (err) {
      BotLogger.error('Failed to toggle auto-welcome', err);
      await reply(`${decorations.fire} 『 ERROR 』
═══════════════════════════
❌ Failed to update setting`);
    }
  }
};

export default command;
