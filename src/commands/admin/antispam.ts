import type { Command, CommandContext } from '../../types/index.js';
import { BotLogger } from '../../lib/logger.js';
import { database } from '../../database/index.js';
import { decorations } from '../../lib/messageFormatter.js';

const command: Command = {
  name: 'antispam',
  aliases: ['spam', 'nospam'],
  description: 'Toggle anti-spam protection for the group',
  category: 'admin',
  usage: 'antispam <on|off>',
  examples: ['antispam on', 'antispam off'],
  adminOnly: true,
  cooldown: 5000,

  async execute(context: CommandContext): Promise<void> {
    const { event, args, reply, prefix } = context;
    
    const option = args[0]?.toLowerCase();
    
    const antispamKey = `antispam_${event.threadId}`;
    const currentSetting = await database.getSetting<string>(antispamKey);
    const isEnabled = currentSetting !== 'false';
    
    if (!option || !['on', 'off'].includes(option)) {
      await reply(`🛡️ 『 ANTI-SPAM 』 🛡️
═══════════════════════════
${decorations.fire} Spam Protection
═══════════════════════════

◈ CURRENT STATUS
═══════════════════════════
➤ Anti-Spam: ${isEnabled ? '🟢 ON' : '🔴 OFF'}

◈ USAGE
═══════════════════════════
➤ ${prefix}antispam on
➤ ${prefix}antispam off

◈ FEATURES
═══════════════════════════
• Rate limiting per user
• Duplicate message detection
• Auto-warn repeat offenders`);
      return;
    }
    
    const enable = option === 'on';
    
    try {
      await database.setSetting(antispamKey, String(enable));
      
      BotLogger.info(`Anti-spam ${enable ? 'enabled' : 'disabled'} for group ${event.threadId}`);
      
      await reply(`🛡️ 『 ANTI-SPAM ${enable ? 'ENABLED' : 'DISABLED'} 』 🛡️
═══════════════════════════
${decorations.fire} Setting Updated
═══════════════════════════

◈ STATUS
═══════════════════════════
➤ Anti-Spam: ${enable ? '🟢 ON' : '🔴 OFF'}

═══════════════════════════
${enable ? '✅ Spam protection is now active' : '⚠️ Spam protection is now disabled'}`);
    } catch (err) {
      BotLogger.error('Failed to toggle anti-spam', err);
      await reply(`${decorations.fire} 『 ERROR 』
═══════════════════════════
❌ Failed to update setting`);
    }
  }
};

export default command;
