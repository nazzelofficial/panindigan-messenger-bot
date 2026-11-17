import type { Command } from '../../types/index.js';
import { decorations } from '../../lib/messageFormatter.js';

export const command: Command = {
  name: 'broadcast',
  aliases: ['bc', 'sendall'],
  description: 'Send a broadcast message to all groups (Owner only)',
  category: 'admin',
  usage: 'broadcast <message>',
  examples: ['broadcast Bot will restart in 5 minutes!', 'broadcast New update available!'],
  cooldown: 60000,
  ownerOnly: true,

  async execute({ api, args, reply, sendMessage, config, prefix }) {
    if (!args.length) {
      await reply(`📡 『 BROADCAST 』 📡
═══════════════════════════
${decorations.fire} System-wide messaging
═══════════════════════════

◈ USAGE
═══════════════════════════
➤ ${prefix}broadcast <message>

◈ EXAMPLE
═══════════════════════════
➤ ${prefix}broadcast Update coming!

⚠️ Owner only command`);
      return;
    }

    const message = args.join(' ');
    const timestamp = new Date().toLocaleString('en-US', { 
      timeZone: 'Asia/Manila',
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    try {
      const threadList = await api.getThreadList({ limit: 100, tags: ['INBOX'] });
      const threads = threadList.threads;
      const groupThreads = threads.filter((t: any) => t.isGroup);
      
      if (groupThreads.length === 0) {
        await reply(`${decorations.fire} 『 ERROR 』
═══════════════════════════
❌ No group chats found`);
        return;
      }

      await reply(`📡 『 BROADCAST 』 📡
═══════════════════════════
⏳ Sending to ${groupThreads.length} groups...
═══════════════════════════`);

      let sent = 0;
      let failed = 0;

      const broadcastMessage = `📡 『 SYSTEM BROADCAST 』 📡
═══════════════════════════
${decorations.fire} From: ${config.bot.name}
═══════════════════════════

${message}

═══════════════════════════
⏰ Sent: ${timestamp}
🤖 ${config.bot.name} System
═══════════════════════════`;

      for (const thread of groupThreads) {
        try {
          const threadId = ('' + thread.id).trim();
          await sendMessage(broadcastMessage, threadId);
          sent++;
          await new Promise(r => setTimeout(r, 1500));
        } catch {
          failed++;
        }
      }

      const successRate = Math.round((sent / groupThreads.length) * 100);
      const statusBar = '█'.repeat(Math.floor(successRate / 10)) + '░'.repeat(10 - Math.floor(successRate / 10));

      await reply(`📡 『 BROADCAST COMPLETE 』 📡
═══════════════════════════
${decorations.sparkle} Delivery Report
═══════════════════════════

◈ SUCCESS RATE
═══════════════════════════
[${statusBar}] ${successRate}%

◈ STATISTICS
═══════════════════════════
✅ Sent: ${sent} groups
❌ Failed: ${failed} groups
📊 Total: ${groupThreads.length} groups

═══════════════════════════
⏰ Completed: ${timestamp}`);
    } catch (error) {
      await reply(`${decorations.fire} 『 ERROR 』
═══════════════════════════
❌ Broadcast failed
💡 Try again later`);
    }
  },
};

export default command;
