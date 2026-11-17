import type { Command, CommandContext } from '../../types/index.js';
import { BotLogger } from '../../lib/logger.js';
import { database } from '../../database/index.js';
import { decorations } from '../../lib/messageFormatter.js';
import { safeGetUserInfo } from '../../lib/apiHelpers.js';

const command: Command = {
  name: 'mute',
  aliases: ['silence', 'timeout'],
  description: 'Mute a user from using bot commands temporarily',
  category: 'admin',
  usage: 'mute <@mention|userId> <time>',
  examples: ['mute @user 10m', 'mute 123456789 1h', 'mute @user 30s'],
  adminOnly: true,
  cooldown: 5000,

  async execute(context: CommandContext): Promise<void> {
    const { api, event, args, reply, prefix } = context;
    
    let targetId: string | null = null;
    let timeArg: string | null = null;
    
    if (event.mentions && Object.keys(event.mentions).length > 0) {
      targetId = String(Object.keys(event.mentions)[0]);
      timeArg = args.find(arg => /^\d+[smhd]$/i.test(arg)) || null;
    } else if (args[0] && /^\d+$/.test(args[0])) {
      targetId = args[0].trim();
      timeArg = args[1] || null;
    }
    
    if (!targetId || !timeArg) {
      await reply(`🔇 『 MUTE USER 』 🔇
═══════════════════════════
${decorations.fire} Temporarily mute a user
═══════════════════════════

◈ USAGE
═══════════════════════════
➤ ${prefix}mute @user <time>
➤ ${prefix}mute <ID> <time>

◈ TIME FORMATS
═══════════════════════════
➤ 30s = 30 seconds
➤ 10m = 10 minutes
➤ 1h = 1 hour
➤ 1d = 1 day

◈ EXAMPLE
═══════════════════════════
➤ ${prefix}mute @user 10m`);
      return;
    }
    
    const match = timeArg.match(/^(\d+)([smhd])$/i);
    if (!match) {
      await reply(`${decorations.fire} 『 ERROR 』
═══════════════════════════
❌ Invalid time format
💡 Use: 30s, 10m, 1h, or 1d`);
      return;
    }
    
    const amount = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    let durationMs: number;
    let durationText: string;
    
    switch (unit) {
      case 's':
        durationMs = amount * 1000;
        durationText = `${amount} second${amount > 1 ? 's' : ''}`;
        break;
      case 'm':
        durationMs = amount * 60 * 1000;
        durationText = `${amount} minute${amount > 1 ? 's' : ''}`;
        break;
      case 'h':
        durationMs = amount * 60 * 60 * 1000;
        durationText = `${amount} hour${amount > 1 ? 's' : ''}`;
        break;
      case 'd':
        durationMs = amount * 24 * 60 * 60 * 1000;
        durationText = `${amount} day${amount > 1 ? 's' : ''}`;
        break;
      default:
        durationMs = amount * 60 * 1000;
        durationText = `${amount} minutes`;
    }
    
    try {
      const userInfo = await safeGetUserInfo(api, targetId);
      const userName = userInfo[targetId]?.name || 'Unknown User';
      
      const muteKey = `muted_${event.threadId}_${targetId}`;
      const expiresAt = Date.now() + durationMs;
      
      await database.setSetting(muteKey, JSON.stringify({
        mutedBy: String(event.senderId),
        expiresAt,
        reason: 'Muted by admin',
        timestamp: new Date().toISOString()
      }));
      
      const timestamp = new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Manila',
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      
      const expiresAtStr = new Date(expiresAt).toLocaleString('en-US', {
        timeZone: 'Asia/Manila',
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      
      BotLogger.info(`Muted user ${targetId} (${userName}) for ${durationText}`);
      
      await reply(`🔇 『 USER MUTED 』 🔇
═══════════════════════════
${decorations.fire} User Muted Successfully
═══════════════════════════

◈ USER INFO
═══════════════════════════
👤 Name: ${userName}
🆔 ID: ${targetId}
⏱️ Duration: ${durationText}
⏰ Muted At: ${timestamp}
📅 Expires: ${expiresAtStr}

═══════════════════════════
💡 Use ${prefix}unmute @user to unmute`);
    } catch (err) {
      BotLogger.error(`Failed to mute user ${targetId}`, err);
      await reply(`${decorations.fire} 『 ERROR 』
═══════════════════════════
❌ Failed to mute user`);
    }
  }
};

export default command;
