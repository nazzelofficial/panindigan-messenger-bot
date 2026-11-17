import type { Command, CommandContext } from '../../types/index.js';
import { safeGetUserInfo } from '../../lib/apiHelpers.js';
import musicService from '../../services/musicService.js';
import { logger } from '../../lib/logger.js';

export const command: Command = {
  name: 'add',
  aliases: ['addqueue', 'enqueue'],
  description: 'Add a song to the queue',
  category: 'music',
  usage: 'add <song name or URL>',
  examples: ['add Never Gonna Give You Up', 'add https://youtube.com/...'],
  cooldown: 3000,

  async execute({ api, event, args, reply, prefix }: CommandContext): Promise<void> {
    if (args.length === 0) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ➕ 𝗔𝗗𝗗 𝗧𝗢 𝗤𝗨𝗘𝗨𝗘 ➕     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌── 📖 𝗨𝘀𝗮𝗴𝗲 ──┐
│ ${prefix}add <song/URL>
└────────────────────┘

┌── 💡 𝗘𝘅𝗮𝗺𝗽𝗹𝗲𝘀 ──┐
│ ${prefix}add Despacito
│ ${prefix}add https://youtube.com/...
└────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎧 Add songs to the queue`);
      return;
    }

    const query = args.join(' ');
    const threadId = event.threadId;
    const userId = event.senderId;

    try {
      let track: any = null;

      if (musicService.isYouTubeUrl(query)) {
        await reply(`🔍 Fetching from YouTube...`);
        track = await musicService.getYouTubeInfo(query);
      } else if (musicService.isSpotifyUrl(query)) {
        await reply(`🔍 Fetching from Spotify...`);
        track = await musicService.getSpotifyTrack(query);
      } else {
        await reply(`🔍 Searching for "${query}"...`);
        const results = await musicService.searchYouTube(query, 1);
        if (results.length > 0) {
          track = results[0];
        }
      }

      if (!track) {
        await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ❌ 𝗡𝗢𝗧 𝗙𝗢𝗨𝗡𝗗 ❌     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

⚠️ Could not find any song matching:
"${query}"

💡 Try a different search term or URL`);
        return;
      }

      const userInfo = await safeGetUserInfo(api, userId);
      const userName = userInfo[userId]?.name || 'Unknown';
      track.requestedBy = userName;
      track.requestedAt = new Date();

      const position = musicService.addToQueue(threadId, track);
      const session = musicService.getSession(threadId);

      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ➕ 𝗔𝗗𝗗𝗘𝗗 𝗧𝗢 𝗤𝗨𝗘𝗨𝗘 ➕     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌── 🎵 𝗧𝗿𝗮𝗰𝗸 𝗜𝗻𝗳𝗼 ──┐
│ 🎶 ${track.title}
│ 👤 ${track.artist}
│ ⏱️ ${musicService.formatDuration(track.duration)}
│ 📺 ${track.source === 'youtube' ? 'YouTube' : 'Spotify'}
└────────────────────────┘

┌── 📊 𝗤𝘂𝗲𝘂𝗲 ──┐
│ 📍 Position: #${position}
│ 🎵 Total in queue: ${session.queue.length}
│ 👤 Requested by: ${userName}
└────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 ${prefix}queue to view full queue`);

      logger.info('Song added to queue', { threadId, track: track.title });
    } catch (error) {
      logger.error('Add command failed', { error });
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ❌ 𝗘𝗥𝗥𝗢𝗥 ❌     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

⚠️ Failed to add song to queue.
Please try again later.`);
    }
  }
};
