import type { Command, CommandContext } from '../../types/index.js';
import { BotLogger } from '../../lib/logger.js';
import { database } from '../../database/index.js';
import { decorations } from '../../lib/messageFormatter.js';

const command: Command = {
  name: 'adminonly',
  aliases: ['adminsonly', 'adminmode'],
  description: 'Toggle admin-only mode for bot commands',
  category: 'admin',
  usage: 'adminonly <on|off>',
  examples: ['adminonly on', 'adminonly off'],
  adminOnly: true,
  cooldown: 5000,

  async execute(context: CommandContext): Promise<void> {
    const { event, args, reply, prefix } = context;
    
    const option = args[0]?.toLowerCase();
    
    if (!option || !['on', 'off'].includes(option)) {
      const currentSetting = await database.getSetting(`adminonly_${event.threadId}`);
      const isEnabled = currentSetting === 'true';
      
      await reply(`🔒 『 ADMIN ONLY MODE 』 🔒
═══════════════════════════
${decorations.fire} Restrict bot to admins
═══════════════════════════

◈ CURRENT STATUS
═══════════════════════════
➤ Mode: ${isEnabled ? '🔒 ON (Admins Only)' : '🔓 OFF (Everyone)'}

◈ USAGE
═══════════════════════════
➤ ${prefix}adminonly on
➤ ${prefix}adminonly off

◈ DESCRIPTION
═══════════════════════════
When ON, only group admins can
use bot commands in this group.`);
      return;
    }
    
    const enable = option === 'on';
    
    try {
      await database.setSetting(`adminonly_${event.threadId}`, String(enable));
      
      BotLogger.info(`Admin-only mode ${enable ? 'enabled' : 'disabled'} for group ${event.threadId}`);
      
      await reply(`🔒 『 ADMIN ONLY ${enable ? 'ENABLED' : 'DISABLED'} 』 🔒
═══════════════════════════
${decorations.fire} Setting Updated
═══════════════════════════

◈ NEW STATUS
═══════════════════════════
➤ Mode: ${enable ? '🔒 ON' : '🔓 OFF'}
➤ Access: ${enable ? 'Admins Only' : 'Everyone'}

═══════════════════════════
${enable ? '⚠️ Only admins can use commands now' : '✅ Everyone can use commands now'}`);
    } catch (err) {
      BotLogger.error(`Failed to set admin-only mode for group ${event.threadId}`, err);
      await reply(`${decorations.fire} 『 ERROR 』
═══════════════════════════
❌ Failed to update setting`);
    }
  }
};

export default command;
