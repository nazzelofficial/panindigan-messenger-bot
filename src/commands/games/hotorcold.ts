import type { Command } from '../../types/index.js';
const games = new Map<string, number>();
export const command: Command = { name: 'hotcold', aliases: ['hotorcold'], description: 'Hot or Cold guessing game', category: 'games', usage: 'hotcold [number]', examples: ['hotcold', 'hotcold 50'], cooldown: 3000,
  async execute({ reply, args, event }) {
    const tid = event.threadId;
    if (!args.length) { games.set(tid, Math.floor(Math.random() * 100) + 1); return reply('🌡️ HOT OR COLD\n\nI picked a number 1-100. Guess it!\nUse: hotcold <number>'); }
    const target = games.get(tid); if (!target) return reply('❌ Start a game first!');
    const guess = parseInt(args[0]); if (isNaN(guess)) return reply('❌ Enter a number!');
    const diff = Math.abs(target - guess);
    if (diff === 0) { games.delete(tid); return reply(`🎉 CORRECT! The number was ${target}`); }
    if (diff <= 5) await reply('🔥 HOT!'); else if (diff <= 15) await reply('🌡️ Warm'); else if (diff <= 30) await reply('❄️ Cold'); else await reply('🥶 FREEZING!');
  },
};
