import type { Command } from '../../types/index.js';

const games = new Map<string, { startTime: number, target: string, active: boolean }>();
const targets = ['🎯', '⭐', '💎', '🔥', '⚡', '🌟', '💥', '✨'];

export const command: Command = {
  name: 'reaction',
  aliases: ['react', 'reflex', 'speed'],
  description: 'Test your reaction time',
  category: 'games',
  usage: 'reaction | reaction go',
  examples: ['reaction', 'reaction go'],
  cooldown: 5000,

  async execute({ reply, args, event }) {
    const threadId = event.threadId;

    if (!args.length) {
      const target = targets[Math.floor(Math.random() * targets.length)];
      const delay = Math.floor(Math.random() * 3000) + 2000;
      
      games.set(threadId, { startTime: 0, target, active: false });
      
      await reply(`⏱️ REACTION TEST\n\nGet ready...\nWhen you see ${target}, type: reaction go\n\nWaiting...`);
      
      setTimeout(async () => {
        const game = games.get(threadId);
        if (game) {
          game.startTime = Date.now();
          game.active = true;
        }
      }, delay);
      
      games.get(threadId)!.startTime = Date.now() + delay;
      games.get(threadId)!.active = true;
      
      return;
    }

    if (args[0] === 'go') {
      const game = games.get(threadId);
      if (!game) return reply('❌ No active game. Start with: reaction');
      
      if (!game.active) return reply('❌ Wait for the signal!');
      
      const reactionTime = Date.now() - game.startTime;
      games.delete(threadId);
      
      let rating = '';
      if (reactionTime < 200) rating = '⚡ LIGHTNING FAST!';
      else if (reactionTime < 300) rating = '🔥 Excellent!';
      else if (reactionTime < 500) rating = '👍 Good!';
      else if (reactionTime < 800) rating = '😐 Average';
      else rating = '🐢 Slow...';
      
      return reply(`${game.target} REACTION TIME\n\n⏱️ ${reactionTime}ms\n\n${rating}`);
    }

    return reply('❌ Invalid. Use: reaction or reaction go');
  },
};
