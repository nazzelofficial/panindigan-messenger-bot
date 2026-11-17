import type { Command, CommandContext } from '../../types/index.js';
import musicService from '../../services/musicService.js';

export const command: Command = {
  name: 'volume',
  aliases: ['vol', 'v'],
  description: 'Adjust the volume level (0-100)',
  category: 'music',
  usage: 'volume [0-100]',
  examples: ['volume', 'volume 50', 'vol 75'],
  cooldown: 2000,

  async execute({ event, args, reply, prefix }: CommandContext): Promise<void> {
    const threadId = event.threadId;
    const session = musicService.getSession(threadId);

    if (args.length === 0) {
      const volumeBar = createVolumeBar(session.volume);
      
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     🔊 𝗩𝗢𝗟𝗨𝗠𝗘 🔊     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌── 🔈 𝗖𝘂𝗿𝗿𝗲𝗻𝘁 𝗩𝗼𝗹𝘂𝗺𝗲 ──┐
│ ${volumeBar}
│ 🔊 ${session.volume}%
└────────────────────────┘

┌── 📖 𝗨𝘀𝗮𝗴𝗲 ──┐
│ ${prefix}volume <0-100>
└────────────────────┘

┌── 💡 𝗘𝘅𝗮𝗺𝗽𝗹𝗲𝘀 ──┐
│ ${prefix}volume 50  (50%)
│ ${prefix}volume 100 (Max)
│ ${prefix}vol 25     (Quiet)
└────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎧 Adjust playback volume`);
      return;
    }

    const volume = parseInt(args[0]);

    if (isNaN(volume) || volume < 0 || volume > 100) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ⚠️ 𝗜𝗡𝗩𝗔𝗟𝗜𝗗 ⚠️     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

❌ Volume must be between 0 and 100.

┌── 📖 𝗨𝘀𝗮𝗴𝗲 ──┐
│ ${prefix}volume <0-100>
└────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔊 Current: ${session.volume}%`);
      return;
    }

    const oldVolume = session.volume;
    musicService.setVolume(threadId, volume);
    const volumeBar = createVolumeBar(volume);

    const volumeEmoji = volume === 0 ? '🔇' : volume < 30 ? '🔈' : volume < 70 ? '🔉' : '🔊';

    await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ${volumeEmoji} 𝗩𝗢𝗟𝗨𝗠𝗘 𝗖𝗛𝗔𝗡𝗚𝗘𝗗 ${volumeEmoji}     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌── 🔊 𝗩𝗼𝗹𝘂𝗺𝗲 ──┐
│ ${volumeBar}
│ 📊 ${oldVolume}% → ${volume}%
└────────────────────┘

${session.currentTrack ? `┌── 🎵 𝗡𝗼𝘄 𝗣𝗹𝗮𝘆𝗶𝗻𝗴 ──┐
│ 🎶 ${session.currentTrack.title.substring(0, 30)}...
└────────────────────────┘` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎧 Volume set to ${volume}%`);
  }
};

function createVolumeBar(volume: number): string {
  const filled = Math.round(volume / 10);
  const empty = 10 - filled;
  return '🔈 ' + '█'.repeat(filled) + '░'.repeat(empty) + ' 🔊';
}
