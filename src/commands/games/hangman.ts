import type { Command } from '../../types/index.js';

const words = ['FACEBOOK', 'MESSENGER', 'COMPUTER', 'KEYBOARD', 'MONITOR', 'PROGRAMMING', 'JAVASCRIPT', 'TYPESCRIPT', 'DATABASE', 'ALGORITHM', 'FUNCTION', 'VARIABLE', 'ELEPHANT', 'GIRAFFE', 'DOLPHIN', 'PENGUIN', 'BUTTERFLY', 'RAINBOW', 'SUNSHINE', 'MOUNTAIN', 'WATERFALL', 'CHOCOLATE', 'ADVENTURE', 'BEAUTIFUL', 'CHAMPION'];
const games = new Map<string, { word: string, guessed: Set<string>, wrong: number, maxWrong: 6 }>();

const hangmanArt = [
  '```\n  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========```',
  '```\n  +---+\n  |   |\n  O   |\n      |\n      |\n      |\n=========```',
  '```\n  +---+\n  |   |\n  O   |\n  |   |\n      |\n      |\n=========```',
  '```\n  +---+\n  |   |\n  O   |\n /|   |\n      |\n      |\n=========```',
  '```\n  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n      |\n=========```',
  '```\n  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n=========```',
  '```\n  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n      |\n=========```'
];

export const command: Command = {
  name: 'hangman',
  aliases: ['hm', 'bitin'],
  description: 'Play hangman word guessing game',
  category: 'games',
  usage: 'hangman | hangman <letter> | hangman end',
  examples: ['hangman', 'hangman a'],
  cooldown: 3000,

  async execute({ reply, args, event }) {
    const threadId = event.threadId;

    if (args[0] === 'end') {
      if (games.has(threadId)) {
        const game = games.get(threadId)!;
        games.delete(threadId);
        return reply(`🎮 Game ended! The word was: ${game.word}`);
      }
      return reply('❌ No active game.');
    }

    if (!args.length) {
      if (games.has(threadId)) return reply('❌ Game in progress! Guess a letter or use "hangman end"');
      
      const word = words[Math.floor(Math.random() * words.length)];
      games.set(threadId, { word, guessed: new Set(), wrong: 0, maxWrong: 6 });
      
      const display = word.split('').map(() => '_').join(' ');
      return reply(`🎮 HANGMAN\n${hangmanArt[0]}\n\nWord: ${display}\n\nGuess a letter: hangman <letter>`);
    }

    const game = games.get(threadId);
    if (!game) return reply('❌ No active game. Start with: hangman');

    const letter = args[0].toUpperCase();
    if (letter.length !== 1 || !/[A-Z]/.test(letter)) return reply('❌ Enter a single letter!');
    if (game.guessed.has(letter)) return reply('❌ Already guessed that letter!');

    game.guessed.add(letter);

    if (!game.word.includes(letter)) {
      game.wrong++;
    }

    const display = game.word.split('').map(l => game.guessed.has(l) ? l : '_').join(' ');
    const guessedLetters = Array.from(game.guessed).join(', ');

    if (game.wrong >= game.maxWrong) {
      games.delete(threadId);
      return reply(`💀 GAME OVER!\n${hangmanArt[6]}\n\nThe word was: ${game.word}`);
    }

    if (!display.includes('_')) {
      games.delete(threadId);
      return reply(`🎉 YOU WON!\n${hangmanArt[game.wrong]}\n\nWord: ${game.word}`);
    }

    return reply(`🎮 HANGMAN\n${hangmanArt[game.wrong]}\n\nWord: ${display}\nGuessed: ${guessedLetters}\nWrong: ${game.wrong}/${game.maxWrong}`);
  },
};
