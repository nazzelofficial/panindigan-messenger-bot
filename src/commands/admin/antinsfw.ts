import type { Command, CommandContext } from '../../types/index.js';
import { BotLogger } from '../../lib/logger.js';
import { antiNsfw } from '../../lib/antiNsfw.js';
import { decorations } from '../../lib/messageFormatter.js';

const command: Command = {
  name: 'antinsfw',
  aliases: ['antiporn', 'no18+', 'antirestricted'],
  description: 'Toggle anti-NSFW protection (auto-deletes 18+ images/videos)',
  category: 'admin',
  usage: 'antinsfw <on|off|check>',
  examples: ['antinsfw on', 'antinsfw off', 'antinsfw check'],
  adminOnly: true,
  cooldown: 5000,

  async execute(context: CommandContext): Promise<void> {
    const { event, args, reply, prefix } = context;
    
    const option = args[0]?.toLowerCase();
    const isEnabled = await antiNsfw.isEnabled(event.threadID);
    
    if (!option || !['on', 'off'].includes(option)) {
      await reply(`🔞 『 ANTI-NSFW 』 🔞
═══════════════════════════
${decorations.fire} 18+ Content Protection
═══════════════════════════

◈ CURRENT STATUS
═══════════════════════════
➤ Anti-NSFW: ${isEnabled ? '🟢 ACTIVE (Strict Mode)' : '🔴 DISABLED'}

◈ USAGE
═══════════════════════════
➤ ${prefix}antinsfw on
➤ ${prefix}antinsfw off
➤ ${prefix}antinsfw check

◈ FEATURES
═══════════════════════════
• Strict Skin Tone Detection (No AI)
• Auto-deletes 18+ images/videos
• Scans Video Thumbnails
• Unsend First Policy (Instant Delete)
• Keeps the group clean`);
      return;
    }
    
    const enable = option === 'on';
    
    try {
      await antiNsfw.setEnabled(event.threadID, enable);
      
      // Verify persistence immediately
      const verify = await antiNsfw.isEnabled(event.threadID);
      if (verify !== enable) {
         BotLogger.warn(`[AntiNSFW] Persistence check failed for ${event.threadID}. Expected ${enable}, got ${verify}`);
      }
      
      BotLogger.info(`Anti-NSFW ${enable ? 'enabled' : 'disabled'} for group ${event.threadID}`);
      
      await reply(`🔞 『 ANTI-NSFW ${enable ? 'ENABLED' : 'DISABLED'} 』 🔞
═══════════════════════════
${decorations.fire} Setting Updated
═══════════════════════════

◈ STATUS
═══════════════════════════
➤ Anti-NSFW: ${enable ? '🟢 ON' : '🔴 OFF'}

═══════════════════════════
${enable ? '✅ 18+ content protection is now active' : '⚠️ 18+ content protection is now disabled'}`);
    } catch (err) {
      BotLogger.error('Failed to toggle anti-nsfw', err);
      await reply(`${decorations.fire} 『 ERROR 』
═══════════════════════════
❌ Failed to update setting`);
    }
  }
};

export default command;
