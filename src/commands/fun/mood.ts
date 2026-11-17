import type { Command, CommandContext } from '../../types/index.js';
import { safeGetUserInfo } from '../../lib/apiHelpers.js';

const moods = [
  { emoji: '😊', mood: 'Happy', message: 'You seem to be in a great mood today!' },
  { emoji: '😎', mood: 'Cool', message: 'Looking cool and confident!' },
  { emoji: '🤔', mood: 'Thoughtful', message: 'Deep in thought, I see!' },
  { emoji: '😴', mood: 'Sleepy', message: 'Time for some rest maybe?' },
  { emoji: '🔥', mood: 'On Fire', message: 'You are unstoppable today!' },
  { emoji: '😍', mood: 'In Love', message: 'Feeling the love vibes!' },
  { emoji: '🎉', mood: 'Excited', message: 'Something exciting is coming!' },
  { emoji: '😌', mood: 'Peaceful', message: 'Inner peace achieved!' },
  { emoji: '💪', mood: 'Strong', message: 'Feeling powerful and strong!' },
  { emoji: '🌟', mood: 'Radiant', message: 'You are shining bright today!' },
  { emoji: '😏', mood: 'Mischievous', message: 'Planning something fun?' },
  { emoji: '🤗', mood: 'Warm', message: 'Spreading warmth and kindness!' },
];

const command: Command = {
  name: 'mood',
  aliases: ['feeling', 'vibe'],
  description: 'Check your current mood/vibe',
  category: 'fun',
  usage: 'mood',
  examples: ['mood'],

  async execute(context: CommandContext): Promise<void> {
    const { api, event, reply } = context;
    const senderId = ('' + event.senderId).trim();

    try {
      const userInfo = await safeGetUserInfo(api, senderId);
      const userName = userInfo[senderId]?.name || 'Friend';
      const randomMood = moods[Math.floor(Math.random() * moods.length)];

      await reply(`${randomMood.emoji} *${userName}'s Mood Check*\n\nMood: ${randomMood.mood}\n${randomMood.message}`);
    } catch (error) {
      const randomMood = moods[Math.floor(Math.random() * moods.length)];
      await reply(`${randomMood.emoji} *Your Mood Check*\n\nMood: ${randomMood.mood}\n${randomMood.message}`);
    }
  }
};

export default command;
