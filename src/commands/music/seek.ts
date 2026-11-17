import type { Command, CommandContext } from '../../types/index.js';
import musicService from '../../services/musicService.js';

export const command: Command = {
  name: 'seek',
  aliases: ['jump', 'goto'],
  description: 'Jump to a specific time in the song',
  category: 'music',
  usage: 'seek <time>',
  examples: ['seek 1:30', 'seek 90', 'seek 2:15'],
  cooldown: 2000,

  async execute({ event, args, reply, prefix }: CommandContext): Promise<void> {
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

    if (args.length === 0) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ⏱️ 𝗦𝗘𝗘𝗞 ⏱️     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌── 📖 𝗨𝘀𝗮𝗴𝗲 ──┐
│ ${prefix}seek <time>
└────────────────────┘

┌── 📖 𝗧𝗶𝗺𝗲 𝗙𝗼𝗿𝗺𝗮𝘁𝘀 ──┐
│ ⏱️ 1:30  (1 min 30 sec)
│ ⏱️ 90    (90 seconds)
│ ⏱️ 2:15  (2 min 15 sec)
└────────────────────────┘

┌── 🎵 𝗖𝘂𝗿𝗿𝗲𝗻𝘁 𝗧𝗿𝗮𝗰𝗸 ──┐
│ 🎶 ${session.currentTrack.title.substring(0, 30)}...
│ ⏱️ Duration: ${musicService.formatDuration(session.currentTrack.duration)}
└────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Jump to any position in the song`);
      return;
    }

    const timeStr = args[0];
    let seconds = parseTime(timeStr);

    if (seconds === null || seconds < 0) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ⚠️ 𝗜𝗡𝗩𝗔𝗟𝗜𝗗 𝗧𝗜𝗠𝗘 ⚠️     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

❌ Invalid time format: "${timeStr}"

┌── 📖 𝗩𝗮𝗹𝗶𝗱 𝗙𝗼𝗿𝗺𝗮𝘁𝘀 ──┐
│ ⏱️ 1:30  (minutes:seconds)
│ ⏱️ 90    (total seconds)
└────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 ${prefix}seek 1:30`);
      return;
    }

    const duration = session.currentTrack.duration;
    
    if (seconds > duration) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ⚠️ 𝗢𝗨𝗧 𝗢𝗙 𝗥𝗔𝗡𝗚𝗘 ⚠️     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

❌ Cannot seek beyond song duration.

┌── 📊 𝗜𝗻𝗳𝗼 ──┐
│ 🎵 ${session.currentTrack.title.substring(0, 30)}...
│ ⏱️ Duration: ${musicService.formatDuration(duration)}
│ ❌ Requested: ${musicService.formatDuration(seconds)}
└────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Try a time within the song length`);
      return;
    }

    const oldPos = musicService.getCurrentPosition(threadId);
    musicService.seekTo(threadId, seconds);

    const progressBar = musicService.createProgressBar(seconds, duration);

    await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ⏱️ 𝗦𝗘𝗘𝗞𝗘𝗗 ⏱️     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌── 🎵 𝗧𝗿𝗮𝗰𝗸 ──┐
│ 🎶 ${session.currentTrack.title}
│ 👤 ${session.currentTrack.artist}
└────────────────────────┘

┌── ⏱️ 𝗣𝗼𝘀𝗶𝘁𝗶𝗼𝗻 ──┐
│ ${progressBar}
│ ${musicService.formatDuration(oldPos)} → ${musicService.formatDuration(seconds)}
│ ⏱️ / ${musicService.formatDuration(duration)}
└────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎧 Jumped to ${musicService.formatDuration(seconds)}`);
  }
};

function parseTime(timeStr: string): number | null {
  if (timeStr.includes(':')) {
    const parts = timeStr.split(':').map(p => parseInt(p));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return parts[0] * 60 + parts[1];
    }
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return null;
  }
  
  const seconds = parseInt(timeStr);
  return isNaN(seconds) ? null : seconds;
}
