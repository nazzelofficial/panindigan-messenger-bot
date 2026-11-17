import type { Command, CommandContext } from '../../types/index.js';
import { BotLogger } from '../../lib/logger.js';
import { database } from '../../database/index.js';
import { decorations } from '../../lib/messageFormatter.js';
import { safeGetUserInfo } from '../../lib/apiHelpers.js';

const command: Command = {
  name: 'warn',
  aliases: ['warning', 'strike'],
  description: 'Warn a user for rule violations',
  category: 'admin',
  usage: 'warn <@mention|userId> [reason]',
  examples: ['warn @user Spamming', 'warn 123456789 Breaking rules'],
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
      await reply(`⚠️ 『 WARN USER 』 ⚠️
═══════════════════════════
${decorations.fire} Issue a warning
═══════════════════════════

◈ USAGE
═══════════════════════════
➤ ${prefix}warn @user [reason]
➤ ${prefix}warn <ID> [reason]

◈ EXAMPLE
═══════════════════════════
➤ ${prefix}warn @user Spamming`);
      return;
    }
    
    const reason = args.slice(event.mentions && Object.keys(event.mentions).length > 0 ? 0 : 1)
      .join(' ')
      .replace(/@\S+/g, '')
      .trim() || 'No reason provided';
    
    try {
      const userInfo = await safeGetUserInfo(api, targetId);
      const userName = userInfo[targetId]?.name || 'Unknown User';
      
      const warningsKey = `warnings_${event.threadId}_${targetId}`;
      const existingWarnings = await database.getSetting<string>(warningsKey);
      const warnings = existingWarnings ? JSON.parse(existingWarnings) : [];
      
      const newWarning = {
        reason,
        warnedBy: String(event.senderId),
        timestamp: new Date().toISOString()
      };
      
      warnings.push(newWarning);
      await database.setSetting(warningsKey, JSON.stringify(warnings));
      
      const warningCount = warnings.length;
      const timestamp = new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Manila',
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      
      let statusMessage = '';
      if (warningCount >= 3) {
        statusMessage = '🚨 3 WARNINGS - Consider kicking!';
      } else if (warningCount === 2) {
        statusMessage = '⚠️ Final warning!';
      } else {
        statusMessage = '⚠️ First warning';
      }
      
      BotLogger.info(`Warned user ${targetId} (${userName}) - Warning #${warningCount}`);
      
      await reply(`⚠️ 『 USER WARNED 』 ⚠️
═══════════════════════════
${decorations.fire} Warning Issued
═══════════════════════════

◈ USER INFO
═══════════════════════════
👤 Name: ${userName}
🆔 ID: ${targetId}
📝 Reason: ${reason}
⏰ Time: ${timestamp}

◈ WARNING STATUS
═══════════════════════════
📊 Total Warnings: ${warningCount}/3
${statusMessage}

═══════════════════════════
💡 Use ${prefix}warnings @user to view all`);
    } catch (err) {
      BotLogger.error(`Failed to warn user ${targetId}`, err);
      await reply(`${decorations.fire} 『 ERROR 』
═══════════════════════════
❌ Failed to warn user`);
    }
  }
};

export default command;
