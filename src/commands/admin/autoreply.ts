import type { Command, CommandContext } from '../../types/index.js';
import { BotLogger } from '../../lib/logger.js';
import { database } from '../../database/index.js';
import { decorations } from '../../lib/messageFormatter.js';

const command: Command = {
  name: 'autoreply',
  aliases: ['autorespond', 'ar'],
  description: 'Toggle automatic replies to certain keywords',
  category: 'admin',
  usage: 'autoreply <on|off>',
  examples: ['autoreply on', 'autoreply off'],
  adminOnly: true,
  cooldown: 5000,

  async execute(context: CommandContext): Promise<void> {
    const { event, args, reply, prefix } = context;
    
    const option = args[0]?.toLowerCase();
    
    const replyKey = `autoreply_${event.threadId}`;
    const currentSetting = await database.getSetting<string>(replyKey);
    const isEnabled = currentSetting === 'true';
    
    if (!option || !['on', 'off'].includes(option)) {
      await reply(`💬 『 AUTO REPLY 』 💬
═══════════════════════════
${decorations.fire} Automatic Responses
═══════════════════════════

◈ CURRENT STATUS
═══════════════════════════
➤ Auto Reply: ${isEnabled ? '🟢 ON' : '🔴 OFF'}

◈ USAGE
═══════════════════════════
➤ ${prefix}autoreply on
➤ ${prefix}autoreply off

◈ FEATURES
═══════════════════════════
• Reply to greetings
• Answer common questions
• Keyword triggers`);
      return;
    }
    
    const enable = option === 'on';
    
    try {
      await database.setSetting(replyKey, String(enable));
      
      BotLogger.info(`Auto-reply ${enable ? 'enabled' : 'disabled'} for group ${event.threadId}`);
      
      await reply(`💬 『 AUTO REPLY ${enable ? 'ENABLED' : 'DISABLED'} 』 💬
═══════════════════════════
${decorations.fire} Setting Updated
═══════════════════════════

◈ STATUS
═══════════════════════════
➤ Auto Reply: ${enable ? '🟢 ON' : '🔴 OFF'}

═══════════════════════════
${enable ? '✅ Bot will auto-reply to keywords' : '⚠️ Auto replies disabled'}`);
    } catch (err) {
      BotLogger.error('Failed to toggle auto-reply', err);
      await reply(`${decorations.fire} 『 ERROR 』
═══════════════════════════
❌ Failed to update setting`);
    }
  }
};

export default command;
