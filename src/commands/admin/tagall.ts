import type { Command, CommandContext } from '../../types/index.js';
import { BotLogger } from '../../lib/logger.js';
import { decorations } from '../../lib/messageFormatter.js';
import { safeGetThreadInfo, safeGetUserInfo } from '../../lib/apiHelpers.js';

const command: Command = {
  name: 'tagall',
  aliases: ['mentionall', 'all', '@all'],
  description: 'Tag all members in the group',
  category: 'admin',
  usage: 'tagall [type] [message]',
  examples: ['tagall', 'tagall text Hello everyone!', 'tagall emoji'],
  adminOnly: true,
  cooldown: 30000,

  async execute(context: CommandContext): Promise<void> {
    const { api, event, args, reply, prefix } = context;
    
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
      
      const participants = threadInfo.participantIds || [];
      
      if (participants.length === 0) {
        await reply(`${decorations.fire} 『 ERROR 』
═══════════════════════════
❌ No members found in this group`);
        return;
      }
      
      const type = args[0]?.toLowerCase();
      let message = '';
      let mentions: { tag: string; id: string }[] = [];
      
      const userInfos = await safeGetUserInfo(api, participants);
      
      if (type === 'emoji') {
        const emojis = ['👋', '🎉', '⭐', '🔥', '💫', '✨', '🌟', '💪', '🎊', '🎈'];
        message = `${emojis[Math.floor(Math.random() * emojis.length)]} `;
        
        for (const uid of participants) {
          const name = userInfos[uid]?.name || 'User';
          message += `@${name} `;
          mentions.push({ tag: `@${name}`, id: uid });
        }
      } else if (type === 'text' || type === 'photo') {
        const customMessage = args.slice(1).join(' ') || 'Attention everyone!';
        message = `📢 ${customMessage}\n\n`;
        
        for (const uid of participants) {
          const name = userInfos[uid]?.name || 'User';
          message += `@${name} `;
          mentions.push({ tag: `@${name}`, id: uid });
        }
      } else {
        message = `📢 『 ATTENTION 』 📢
═══════════════════════════
${decorations.fire} Tagging All Members
═══════════════════════════

`;
        for (const uid of participants) {
          const name = userInfos[uid]?.name || 'User';
          message += `@${name}\n`;
          mentions.push({ tag: `@${name}`, id: uid });
        }
        
        message += `
═══════════════════════════
👥 Total: ${participants.length} members
═══════════════════════════`;
      }
      
      await api.sendMessage(
        String(event.threadId),
        { type: 'text', body: message, mentions }
      );
      
      BotLogger.info(`Tagged all ${participants.length} members in group ${event.threadId}`);
    } catch (err) {
      BotLogger.error(`Failed to tag all in group ${event.threadId}`, err);
      await reply(`${decorations.fire} 『 ERROR 』
═══════════════════════════
❌ Failed to tag all members

◈ USAGE
═══════════════════════════
➤ ${prefix}tagall
➤ ${prefix}tagall text <message>
➤ ${prefix}tagall emoji`);
    }
  }
};

export default command;
