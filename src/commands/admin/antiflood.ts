import type { Command, CommandContext } from '../../types/index.js';
import { BotLogger } from '../../lib/logger.js';
import { database } from '../../database/index.js';
import { decorations } from '../../lib/messageFormatter.js';

const command: Command = {
  name: 'antiflood',
  aliases: ['flood', 'noflood'],
  description: 'Toggle anti-flood protection for the group',
  category: 'admin',
  usage: 'antiflood <on|off>',
  examples: ['antiflood on', 'antiflood off'],
  adminOnly: true,
  cooldown: 5000,

  async execute(context: CommandContext): Promise<void> {
    const { event, args, reply, prefix } = context;
    
    const option = args[0]?.toLowerCase();
    
    const antifloodKey = `antiflood_${event.threadId}`;
    const currentSetting = await database.getSetting<string>(antifloodKey);
    const isEnabled = currentSetting !== 'false';
    
    if (!option || !['on', 'off'].includes(option)) {
      await reply(`🌊 『 ANTI-FLOOD 』 🌊
═══════════════════════════
${decorations.fire} Flood Protection
═══════════════════════════

◈ CURRENT STATUS
═══════════════════════════
➤ Anti-Flood: ${isEnabled ? '🟢 ON' : '🔴 OFF'}

◈ USAGE
═══════════════════════════
➤ ${prefix}antiflood on
➤ ${prefix}antiflood off

◈ FEATURES
═══════════════════════════
• Prevents message flooding
• Auto-mute flood offenders
• Rate limit enforcement`);
      return;
    }
    
    const enable = option === 'on';
    
    try {
      await database.setSetting(antifloodKey, String(enable));
      
      BotLogger.info(`Anti-flood ${enable ? 'enabled' : 'disabled'} for group ${event.threadId}`);
      
      await reply(`🌊 『 ANTI-FLOOD ${enable ? 'ENABLED' : 'DISABLED'} 』 🌊
═══════════════════════════
${decorations.fire} Setting Updated
═══════════════════════════

◈ STATUS
═══════════════════════════
➤ Anti-Flood: ${enable ? '🟢 ON' : '🔴 OFF'}

═══════════════════════════
${enable ? '✅ Flood protection is now active' : '⚠️ Flood protection is now disabled'}`);
    } catch (err) {
      BotLogger.error('Failed to toggle anti-flood', err);
      await reply(`${decorations.fire} 『 ERROR 』
═══════════════════════════
❌ Failed to update setting`);
    }
  }
};

export default command;
