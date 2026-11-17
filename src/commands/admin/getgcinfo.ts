import type { Command, CommandContext } from '../../types/index.js';
import { BotLogger } from '../../lib/logger.js';
import { decorations } from '../../lib/messageFormatter.js';
import { safeGetThreadInfo } from '../../lib/apiHelpers.js';

const command: Command = {
  name: 'getgcinfo',
  aliases: ['gcinfo', 'groupinfo', 'threadinfo'],
  description: 'Get detailed group chat information',
  category: 'admin',
  usage: 'getgcinfo',
  examples: ['getgcinfo'],
  adminOnly: false,
  cooldown: 8000,

  async execute(context: CommandContext): Promise<void> {
    const { api, event, reply } = context;
    
    try {
      const threadInfo = await safeGetThreadInfo(api, event.threadId);
      
      if (!threadInfo) {
        await reply(`${decorations.fire} 『 ERROR 』
═══════════════════════════
❌ Unable to fetch group info. Please try again later.`);
        return;
      }
      
      if (!threadInfo.isGroup) {
        await reply(`${decorations.fire} 『 ERROR 』
═══════════════════════════
❌ This command only works in groups`);
        return;
      }
      
      const groupName = threadInfo.name || 'Unnamed Group';
      const memberCount = threadInfo.participantIds?.length || 0;
      const adminCount = threadInfo.adminIDs?.length || 0;
      const emoji = threadInfo.emoji || '👍';
      const color = threadInfo.color || 'Default';
      const messageCount = threadInfo.messageCount || 0;
      const approvalMode = threadInfo.approvalMode ? 'ON' : 'OFF';
      
      const timestamp = new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Manila',
        dateStyle: 'full',
        timeStyle: 'short'
      });
      
      await reply(`📊 『 GROUP INFO 』 📊
═══════════════════════════
${decorations.fire} Detailed Information
═══════════════════════════

◈ BASIC INFO
═══════════════════════════
📝 Name: ${groupName}
🆔 Thread ID: ${event.threadId}
${emoji} Emoji: ${emoji}
🎨 Color: ${color}

◈ MEMBERS
═══════════════════════════
👥 Total Members: ${memberCount}
👑 Admins: ${adminCount}
👤 Regular: ${memberCount - adminCount}

◈ STATISTICS
═══════════════════════════
💬 Messages: ${messageCount.toLocaleString()}
🔒 Approval Mode: ${approvalMode}

═══════════════════════════
📅 Retrieved: ${timestamp}
═══════════════════════════`);
      
      BotLogger.info(`Retrieved group info for ${event.threadId}`);
    } catch (err) {
      BotLogger.error(`Failed to get group info for ${event.threadId}`, err);
      await reply(`${decorations.fire} 『 ERROR 』
═══════════════════════════
❌ Failed to get group info`);
    }
  }
};

export default command;
