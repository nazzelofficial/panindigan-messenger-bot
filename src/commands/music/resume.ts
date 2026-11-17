import type { Command, CommandContext } from '../../types/index.js';
import musicService from '../../services/musicService.js';

export const command: Command = {
  name: 'resume',
  aliases: ['unpause', 'continue'],
  description: 'Resume the paused song',
  category: 'music',
  usage: 'resume',
  examples: ['resume'],
  cooldown: 2000,

  async execute({ event, reply, prefix }: CommandContext): Promise<void> {
    const threadId = event.threadId;
    const session = musicService.getSession(threadId);

    if (!session.currentTrack) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ⚠️ 𝗡𝗢 𝗠𝗨𝗦𝗜𝗖 ⚠️     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

❌ Nothing is currently playing.

💡 Use ${prefix}play <song> to start playing!`);
      return;
    }

    if (!session.isPaused) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ▶️ 𝗔𝗟𝗥𝗘𝗔𝗗𝗬 𝗣𝗟𝗔𝗬𝗜𝗡𝗚 ▶️     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

⚠️ The music is already playing.

💡 Use ${prefix}pause to pause the music!`);
      return;
    }

    musicService.resumeTrack(threadId);
    const currentPos = musicService.getCurrentPosition(threadId);

    await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ▶️ 𝗥𝗘𝗦𝗨𝗠𝗘𝗗 ▶️     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌── 🎵 𝗡𝗼𝘄 𝗣𝗹𝗮𝘆𝗶𝗻𝗴 ──┐
│ 🎶 ${session.currentTrack.title}
│ 👤 ${session.currentTrack.artist}
└────────────────────────┘

┌── ⏱️ 𝗣𝗿𝗼𝗴𝗿𝗲𝘀𝘀 ──┐
│ ${musicService.formatDuration(currentPos)} / ${musicService.formatDuration(session.currentTrack.duration)}
│ ${musicService.createProgressBar(currentPos, session.currentTrack.duration)}
└────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎧 Continuing playback...`);
  }
};
