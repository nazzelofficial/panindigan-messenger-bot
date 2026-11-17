import type { Command, CommandContext } from '../../types/index.js';
import musicService from '../../services/musicService.js';

export const command: Command = {
  name: 'pause',
  aliases: ['pausemusic'],
  description: 'Pause the currently playing song',
  category: 'music',
  usage: 'pause',
  examples: ['pause'],
  cooldown: 2000,

  async execute({ event, reply, prefix }: CommandContext): Promise<void> {
    const threadId = event.threadId;
    const session = musicService.getSession(threadId);

    if (!session.isPlaying || !session.currentTrack) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ⚠️ 𝗡𝗢 𝗠𝗨𝗦𝗜𝗖 ⚠️     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

❌ Nothing is currently playing.

💡 Use ${prefix}play <song> to start playing!`);
      return;
    }

    if (session.isPaused) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ⏸️ 𝗔𝗟𝗥𝗘𝗔𝗗𝗬 𝗣𝗔𝗨𝗦𝗘𝗗 ⏸️     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

⚠️ The music is already paused.

💡 Use ${prefix}resume to continue playing!`);
      return;
    }

    musicService.pauseTrack(threadId);
    const currentPos = musicService.getCurrentPosition(threadId);

    await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ⏸️ 𝗣𝗔𝗨𝗦𝗘𝗗 ⏸️     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌── 🎵 𝗖𝘂𝗿𝗿𝗲𝗻𝘁 𝗧𝗿𝗮𝗰𝗸 ──┐
│ 🎶 ${session.currentTrack.title}
│ 👤 ${session.currentTrack.artist}
└────────────────────────┘

┌── ⏱️ 𝗣𝗿𝗼𝗴𝗿𝗲𝘀𝘀 ──┐
│ ${musicService.formatDuration(currentPos)} / ${musicService.formatDuration(session.currentTrack.duration)}
│ ${musicService.createProgressBar(currentPos, session.currentTrack.duration)}
└────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 ${prefix}resume to continue playing`);
  }
};
