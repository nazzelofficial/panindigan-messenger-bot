import type { Command } from '../../types/index.js';
const capitals: [string, string][] = [['Philippines', 'Manila'], ['Japan', 'Tokyo'], ['USA', 'Washington DC'], ['France', 'Paris'], ['UK', 'London'], ['Germany', 'Berlin'], ['China', 'Beijing'], ['Korea', 'Seoul'], ['Italy', 'Rome'], ['Spain', 'Madrid']];
const games = new Map<string, { country: string, capital: string }>();
export const command: Command = { name: 'capitals', aliases: ['capitalquiz'], description: 'Guess the capital city', category: 'games', usage: 'capitals | capitals <answer>', examples: ['capitals', 'capitals manila'], cooldown: 3000,
  async execute({ reply, args, event }) {
    const tid = event.threadId;
    if (!args.length) { const [country, capital] = capitals[Math.floor(Math.random() * capitals.length)]; games.set(tid, { country, capital }); return reply(`🌍 CAPITAL QUIZ\n\nWhat is the capital of ${country}?\n\nAnswer: capitals <city>`); }
    const game = games.get(tid); if (!game) return reply('❌ Start a game first!');
    if (args.join(' ').toLowerCase() === game.capital.toLowerCase()) { games.delete(tid); await reply(`✅ CORRECT! ${game.country}'s capital is ${game.capital}`); }
    else await reply('❌ Wrong! Try again!');
  },
};
