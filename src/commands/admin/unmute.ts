import type { Command, CommandContext } from '../../types/index.js';
import { BotLogger } from '../../lib/logger.js';
import { database } from '../../database/index.js';
import { decorations } from '../../lib/messageFormatter.js';
import { safeGetUserInfo } from '../../lib/apiHelpers.js';

const command: Command = {
  name: 'unmute',
  aliases: ['unsilence', 'untimeout'],
  description: 'Unmute a previously muted user',
  category: 'admin',
  usage: 'unmute <@mention|userId>',
  examples: ['unmute @user', 'unmute 123456789'],
  adminOnly: true,
  cooldown: 5000,

  async execute(context: CommandContext): Promise<void> {
    const { api, event, args, reply, prefix } = context;
    
    let targetId: string | null = null;
    
    if (event.mentions && Object.keys(event.mentions).length > 0) {
      targetId = String(Object.keys(event.mentions)[0]);
    } else if (args[0] && /^\d+$/.test(args[0])) {
      targetId = args[0].trim();
    }
    
    if (!targetId) {
      await reply(`🔊 『 UNMUTE USER 』 🔊
═══════════════════════════
${decorations.fire} Unmute a user
═══════════════════════════

◈ USAGE
═══════════════════════════
➤ ${prefix}unmute @user
➤ ${prefix}unmute <ID>

◈ EXAMPLE
═══════════════════════════
➤ ${prefix}unmute @user`);
      return;
    }
    
    try {
      const userInfo = await safeGetUserInfo(api, targetId);
      const userName = userInfo[targetId]?.name || 'Unknown User';
      
      const muteKey = `muted_${event.threadId}_${targetId}`;
      const muteData = await database.getSetting(muteKey);
      
      if (!muteData) {
        await reply(`${decorations.fire} 『 NOT MUTED 』
═══════════════════════════
ℹ️ ${userName} is not muted`);
        return;
      }
      
      await database.deleteSetting(muteKey);
      
      const timestamp = new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Manila',
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      
      BotLogger.info(`Unmuted user ${targetId} (${userName})`);
      
      await reply(`🔊 『 USER UNMUTED 』 🔊
═══════════════════════════
${decorations.fire} User Unmuted
═══════════════════════════

◈ USER INFO
═══════════════════════════
👤 Name: ${userName}
🆔 ID: ${targetId}
⏰ Time: ${timestamp}
✅ Status: Unmuted

═══════════════════════════
${decorations.sparkle} User can now use commands`);
    } catch (err) {
      BotLogger.error(`Failed to unmute user ${targetId}`, err);
      await reply(`${decorations.fire} 『 ERROR 』
═══════════════════════════
❌ Failed to unmute user`);
    }
  }
};

export default command;
