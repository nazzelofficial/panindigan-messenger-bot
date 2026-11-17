import type { Command, CommandContext } from '../../types/index.js';
import musicService from '../../services/musicService.js';

export const command: Command = {
  name: 'stop',
  aliases: ['stopmusic', 'disconnect', 'dc'],
  description: 'Stop playback and clear the queue',
  category: 'music',
  usage: 'stop',
  examples: ['stop'],
  cooldown: 2000,

  async execute({ event, reply, prefix }: CommandContext): Promise<void> {
    const threadId = event.threadId;
    const session = musicService.getSession(threadId);

    if (!session.isPlaying && !session.currentTrack && session.queue.length === 0) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ⚠️ 𝗡𝗢 𝗠𝗨𝗦𝗜𝗖 ⚠️     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

❌ Nothing is currently playing.

💡 Use ${prefix}play <song> to start playing!`);
      return;
    }

    const currentTrack = session.currentTrack;
    const queueCount = session.queue.length;
    
    musicService.stopPlayback(threadId);

    await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     🛑 𝗦𝗧𝗢𝗣𝗣𝗘𝗗 🛑     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌── 🎵 𝗦𝘁𝗼𝗽𝗽𝗲𝗱 𝗣𝗹𝗮𝘆𝗶𝗻𝗴 ──┐
│ 🎶 ${currentTrack?.title || 'N/A'}
└────────────────────────┘

┌── 🗑️ 𝗖𝗹𝗲𝗮𝗿𝗲𝗱 ──┐
│ 📋 ${queueCount} songs removed from queue
│ ✅ Session ended
└────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 ${prefix}play <song> to start again`);
  }
};
