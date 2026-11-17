import type { Command } from '../../types/index.js';

const words = ['AMAZING', 'BEAUTIFUL', 'CHAMPION', 'DOLPHIN', 'ELEPHANT', 'FANTASTIC', 'GORGEOUS', 'HARMONY', 'INCREDIBLE', 'JOURNEY', 'KINGDOM', 'LEGENDARY', 'MOUNTAIN', 'NATURE', 'OCEAN', 'PARADISE', 'QUANTUM', 'RAINBOW', 'SUNSHINE', 'TREASURE', 'UNIVERSE', 'VICTORY', 'WONDERFUL', 'EXCELLENT', 'YELLOW', 'ZEALOUS', 'ADVENTURE', 'BUTTERFLY', 'CHRISTMAS', 'DISCOVERY'];

const activeGames = new Map<string, { word: string, scrambled: string, startTime: number }>();

function scramble(word: string): string {
  const arr = word.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const result = arr.join('');
  return result === word ? scramble(word) : result;
}

export const command: Command = {
  name: 'scramble',
  aliases: ['unscramble', 'jumble', 'sc'],
  description: 'Unscramble the word',
  category: 'games',
  usage: 'scramble | scramble <answer>',
  examples: ['scramble', 'scramble rainbow'],
  cooldown: 3000,

  async execute({ reply, args, event }) {
    const threadId = event.threadId;

    if (!args.length) {
      const word = words[Math.floor(Math.random() * words.length)];
      const scrambled = scramble(word);
      activeGames.set(threadId, { word, scrambled, startTime: Date.now() });
      return reply(`🔤 WORD SCRAMBLE\n\n${scrambled}\n\nUnscramble: scramble <word>`);
    }

    const game = activeGames.get(threadId);
    if (!game) return reply('❌ No active game. Start with: scramble');

    const answer = args[0].toUpperCase();
    const elapsed = ((Date.now() - game.startTime) / 1000).toFixed(1);

    if (answer === game.word) {
      activeGames.delete(threadId);
      return reply(`✅ CORRECT!\n\n${game.scrambled} = ${game.word}\nTime: ${elapsed}s`);
    }

    return reply(`❌ Wrong! Try again!\n\nScrambled: ${game.scrambled}`);
  },
};
