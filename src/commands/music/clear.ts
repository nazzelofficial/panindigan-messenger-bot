import type { Command, CommandContext } from '../../types/index.js';
import musicService from '../../services/musicService.js';

export const command: Command = {
  name: 'clear',
  aliases: ['clearqueue', 'cq', 'empty'],
  description: 'Clear the entire music queue',
  category: 'music',
  usage: 'clear',
  examples: ['clear', 'clearqueue'],
  cooldown: 5000,

  async execute({ event, reply, prefix }: CommandContext): Promise<void> {
    const threadId = event.threadId;
    const session = musicService.getSession(threadId);

    if (session.queue.length === 0) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ⚠️ 𝗔𝗟𝗥𝗘𝗔𝗗𝗬 𝗘𝗠𝗣𝗧𝗬 ⚠️     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

❌ The queue is already empty.

${session.currentTrack ? `🎵 Currently playing: ${session.currentTrack.title.substring(0, 30)}...` : '💡 Use ' + prefix + 'play <song> to add music'}`);
      return;
    }

    const count = musicService.clearQueue(threadId);

    await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     🗑️ 𝗤𝗨𝗘𝗨𝗘 𝗖𝗟𝗘𝗔𝗥𝗘𝗗 🗑️     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

✅ Queue has been cleared!

┌── 🗑️ 𝗥𝗲𝗺𝗼𝘃𝗲𝗱 ──┐
│ 🎵 ${count} songs removed
└────────────────────┘

${session.currentTrack ? `┌── 🎵 𝗦𝘁𝗶𝗹𝗹 𝗣𝗹𝗮𝘆𝗶𝗻𝗴 ──┐
│ 🎶 ${session.currentTrack.title.substring(0, 30)}${session.currentTrack.title.length > 30 ? '...' : ''}
│ 👤 ${session.currentTrack.artist}
└────────────────────────┘` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 ${prefix}play <song> to add more music`);
  }
};
