import type { Command, CommandContext } from '../../types/index.js';
import { safeGetUserInfo } from '../../lib/apiHelpers.js';
import musicService from '../../services/musicService.js';
import { logger } from '../../lib/logger.js';

export const command: Command = {
  name: 'play',
  aliases: ['p', 'playmusic', 'playsong'],
  description: 'Play a song from YouTube or Spotify',
  category: 'music',
  usage: 'play <song name or URL>',
  examples: ['play Never Gonna Give You Up', 'play https://youtube.com/watch?v=...'],
  cooldown: 3000,

  async execute({ api, event, args, reply, prefix }: CommandContext): Promise<void> {
    if (args.length === 0) {
      await reply(`╭─────────────────╮
│ 🎵 Play Music
╰─────────────────╯

Usage: ${prefix}play <song/URL>

Examples:
▸ ${prefix}play Despacito
▸ ${prefix}play youtube.com/...`);
      return;
    }

    const query = args.join(' ');
    const threadId = event.threadId;
    const userId = event.senderId;

    try {
      let track: any = null;

      if (musicService.isYouTubeUrl(query)) {
        track = await musicService.getYouTubeInfo(query);
      } else if (musicService.isSpotifyUrl(query)) {
        track = await musicService.getSpotifyTrack(query);
      } else {
        const results = await musicService.searchYouTube(query, 1);
        if (results.length > 0) {
          track = results[0];
        }
      }

      if (!track) {
        await reply(`❌ No results for "${query}"`);
        return;
      }

      const userInfo = await safeGetUserInfo(api, userId);
      const userName = userInfo[userId]?.name || 'Unknown';
      track.requestedBy = userName;
      track.requestedAt = new Date();

      const session = musicService.getSession(threadId);
      
      if (session.isPlaying && session.currentTrack) {
        const position = musicService.addToQueue(threadId, track);
        await reply(`╭─────────────────╮
│ 📋 Added to Queue
╰─────────────────╯

🎵 ${track.title}
👤 ${track.artist}
⏱️ ${musicService.formatDuration(track.duration)}
📍 Position #${position}`);
      } else {
        musicService.playTrack(threadId, track);
        await reply(`╭─────────────────╮
│ 🎵 Now Playing
╰─────────────────╯

🎵 ${track.title}
👤 ${track.artist}
⏱️ ${musicService.formatDuration(track.duration)}
🎧 By: ${userName}`);
      }

      logger.info('Music play command executed', { threadId, track: track.title });
    } catch (error) {
      logger.error('Play command failed', { error });
      await reply(`❌ Failed to play. Try again.`);
    }
  }
};
