import type { Command } from '../../types/index.js';

const flags = [
  { emoji: '🇵🇭', country: 'philippines', aliases: ['ph', 'pinas'] },
  { emoji: '🇺🇸', country: 'united states', aliases: ['usa', 'america', 'us'] },
  { emoji: '🇯🇵', country: 'japan', aliases: ['jp', 'nippon'] },
  { emoji: '🇰🇷', country: 'south korea', aliases: ['korea', 'kr'] },
  { emoji: '🇨🇳', country: 'china', aliases: ['cn', 'prc'] },
  { emoji: '🇬🇧', country: 'united kingdom', aliases: ['uk', 'britain', 'england'] },
  { emoji: '🇫🇷', country: 'france', aliases: ['fr'] },
  { emoji: '🇩🇪', country: 'germany', aliases: ['de', 'deutschland'] },
  { emoji: '🇮🇹', country: 'italy', aliases: ['it', 'italia'] },
  { emoji: '🇪🇸', country: 'spain', aliases: ['es', 'espana'] },
  { emoji: '🇧🇷', country: 'brazil', aliases: ['br', 'brasil'] },
  { emoji: '🇦🇺', country: 'australia', aliases: ['au', 'aussie'] },
  { emoji: '🇨🇦', country: 'canada', aliases: ['ca'] },
  { emoji: '🇲🇽', country: 'mexico', aliases: ['mx'] },
  { emoji: '🇮🇳', country: 'india', aliases: ['in', 'bharat'] },
  { emoji: '🇷🇺', country: 'russia', aliases: ['ru'] },
  { emoji: '🇹🇭', country: 'thailand', aliases: ['th'] },
  { emoji: '🇻🇳', country: 'vietnam', aliases: ['vn'] },
  { emoji: '🇸🇬', country: 'singapore', aliases: ['sg'] },
  { emoji: '🇲🇾', country: 'malaysia', aliases: ['my'] },
];

const games = new Map<string, { flag: typeof flags[0], score: number, total: number }>();

export const command: Command = {
  name: 'flagquiz',
  aliases: ['flag', 'fq', 'countries'],
  description: 'Guess the country from its flag',
  category: 'games',
  usage: 'flagquiz | flagquiz <country>',
  examples: ['flagquiz', 'flagquiz japan'],
  cooldown: 3000,

  async execute({ reply, args, event }) {
    const threadId = event.threadId;

    if (!args.length) {
      const flag = flags[Math.floor(Math.random() * flags.length)];
      const game = games.get(threadId) || { flag, score: 0, total: 0 };
      game.flag = flag;
      games.set(threadId, game);
      
      return reply(`🏳️ FLAG QUIZ\n\n${flag.emoji}\n\nWhat country is this?\n\nAnswer: flagquiz <country>\nScore: ${game.score}/${game.total}`);
    }

    const game = games.get(threadId);
    if (!game) return reply('❌ No active game. Start with: flagquiz');

    const answer = args.join(' ').toLowerCase();
    game.total++;

    if (answer === game.flag.country || game.flag.aliases.includes(answer)) {
      game.score++;
      const newFlag = flags[Math.floor(Math.random() * flags.length)];
      game.flag = newFlag;
      
      return reply(`✅ CORRECT! ${game.flag.emoji} = ${game.flag.country.toUpperCase()}\n\n🏳️ NEXT FLAG\n\n${newFlag.emoji}\n\nScore: ${game.score}/${game.total}`);
    }

    return reply(`❌ Wrong! It was ${game.flag.country.toUpperCase()}\n\nScore: ${game.score}/${game.total}\n\nNext: flagquiz`);
  },
};
