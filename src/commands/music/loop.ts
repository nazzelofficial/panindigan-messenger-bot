import type { Command, CommandContext } from '../../types/index.js';
import musicService from '../../services/musicService.js';

export const command: Command = {
  name: 'loop',
  aliases: ['repeat', 'loopmode'],
  description: 'Set loop mode (off/song/queue)',
  category: 'music',
  usage: 'loop [off|song|queue]',
  examples: ['loop', 'loop song', 'loop queue', 'loop off'],
  cooldown: 2000,

  async execute({ event, args, reply, prefix }: CommandContext): Promise<void> {
    const threadId = event.threadId;
    const session = musicService.getSession(threadId);

    const mode = args[0]?.toLowerCase();

    if (!mode) {
      const modes = ['off', 'song', 'queue'];
      const currentIndex = modes.indexOf(session.loopMode);
      const nextMode = modes[(currentIndex + 1) % 3] as 'off' | 'song' | 'queue';
      musicService.setLoopMode(threadId, nextMode);

      const modeEmoji = nextMode === 'off' ? '➡️' : nextMode === 'song' ? '🔂' : '🔁';
      const modeDesc = nextMode === 'off' ? 'Disabled' : nextMode === 'song' ? 'Current Song' : 'Entire Queue';

      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     🔁 𝗟𝗢𝗢𝗣 𝗠𝗢𝗗𝗘 🔁     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌── ${modeEmoji} 𝗟𝗼𝗼𝗽: ${modeDesc} ──┐
│ ➡️ off   - No repeat
│ 🔂 song  - Repeat current song
│ 🔁 queue - Repeat entire queue
└────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 ${prefix}loop [mode] to set specific mode`);
      return;
    }

    if (!['off', 'song', 'queue'].includes(mode)) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ⚠️ 𝗜𝗡𝗩𝗔𝗟𝗜𝗗 𝗠𝗢𝗗𝗘 ⚠️     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

❌ Invalid loop mode: "${mode}"

┌── 📖 𝗩𝗮𝗹𝗶𝗱 𝗠𝗼𝗱𝗲𝘀 ──┐
│ ➡️ off   - No repeat
│ 🔂 song  - Repeat current song
│ 🔁 queue - Repeat entire queue
└────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 ${prefix}loop [off|song|queue]`);
      return;
    }

    musicService.setLoopMode(threadId, mode as 'off' | 'song' | 'queue');

    const modeEmoji = mode === 'off' ? '➡️' : mode === 'song' ? '🔂' : '🔁';
    const modeDesc = mode === 'off' ? 'Disabled' : mode === 'song' ? 'Current Song' : 'Entire Queue';

    await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     🔁 𝗟𝗢𝗢𝗣 𝗠𝗢𝗗𝗘 🔁     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

✅ Loop mode updated!

┌── ${modeEmoji} 𝗦𝗲𝘁 𝗧𝗼 ──┐
│ Mode: ${modeDesc}
└────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎧 ${session.currentTrack ? `Playing: ${session.currentTrack.title.substring(0, 25)}...` : 'No song playing'}`);
  }
};
