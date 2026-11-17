import type { Command, CommandContext } from '../../types/index.js';
import musicService from '../../services/musicService.js';

export const command: Command = {
  name: 'queue',
  aliases: ['q', 'list', 'playlist'],
  description: 'Display the current music queue',
  category: 'music',
  usage: 'queue [page]',
  examples: ['queue', 'q', 'queue 2'],
  cooldown: 3000,

  async execute({ event, args, reply, prefix }: CommandContext): Promise<void> {
    const threadId = event.threadId;
    const session = musicService.getSession(threadId);

    if (!session.currentTrack && session.queue.length === 0) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     📋 𝗤𝗨𝗘𝗨𝗘 📋     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌── ⚠️ 𝗘𝗺𝗽𝘁𝘆 𝗤𝘂𝗲𝘂𝗲 ──┐
│ No songs in the queue
│ Nothing is playing
└────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 ${prefix}play <song> to add music`);
      return;
    }

    const page = Math.max(1, parseInt(args[0]) || 1);
    const itemsPerPage = 5;
    const totalPages = Math.ceil(session.queue.length / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageQueue = session.queue.slice(startIndex, endIndex);

    let nowPlayingSection = '';
    if (session.currentTrack) {
      const currentPos = musicService.getCurrentPosition(threadId);
      const progressBar = musicService.createProgressBar(currentPos, session.currentTrack.duration, 15);
      const statusEmoji = session.isPaused ? '⏸️' : '▶️';
      
      nowPlayingSection = `┌── ${statusEmoji} 𝗡𝗼𝘄 𝗣𝗹𝗮𝘆𝗶𝗻𝗴 ──┐
│ 🎵 ${session.currentTrack.title.substring(0, 35)}${session.currentTrack.title.length > 35 ? '...' : ''}
│ 👤 ${session.currentTrack.artist}
│ ${progressBar}
│ ${musicService.formatDuration(currentPos)} / ${musicService.formatDuration(session.currentTrack.duration)}
└────────────────────────────┘

`;
    }

    let queueList = '';
    if (pageQueue.length > 0) {
      queueList = pageQueue.map((track, index) => {
        const position = startIndex + index + 1;
        const title = track.title.substring(0, 30) + (track.title.length > 30 ? '...' : '');
        return `│ ${position}. ${title}
│    👤 ${track.artist} • ⏱️ ${musicService.formatDuration(track.duration)}`;
      }).join('\n');
    } else {
      queueList = '│ No more songs in queue';
    }

    const totalDuration = session.queue.reduce((acc, track) => acc + track.duration, 0);
    const loopEmoji = session.loopMode === 'song' ? '🔂' : session.loopMode === 'queue' ? '🔁' : '➡️';

    await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     📋 𝗠𝗨𝗦𝗜𝗖 𝗤𝗨𝗘𝗨𝗘 📋     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

${nowPlayingSection}┌── 📜 𝗨𝗽 𝗡𝗲𝘅𝘁 ──┐
${queueList}
└────────────────────────────┘

┌── 📊 𝗤𝘂𝗲𝘂𝗲 𝗦𝘁𝗮𝘁𝘀 ──┐
│ 🎵 ${session.queue.length} songs in queue
│ ⏱️ Total: ${musicService.formatDuration(totalDuration)}
│ ${loopEmoji} Loop: ${session.loopMode}
│ 🔊 Volume: ${session.volume}%
└────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 Page ${page}/${Math.max(1, totalPages)} • ${prefix}queue [page]`);
  }
};
