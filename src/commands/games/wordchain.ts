import type { Command } from '../../types/index.js';

const games = new Map<string, { lastWord: string, usedWords: Set<string>, lastPlayer: string }>();

export const command: Command = {
  name: 'wordchain',
  aliases: ['wc', 'shiritori'],
  description: 'Word chain game - say a word starting with the last letter',
  category: 'games',
  usage: 'wordchain start | wordchain <word> | wordchain end',
  examples: ['wordchain start', 'wordchain apple'],
  cooldown: 2000,

  async execute({ reply, args, event }) {
    const threadId = event.threadId;
    const senderId = event.senderId;

    if (args[0] === 'end') {
      if (games.has(threadId)) {
        const game = games.get(threadId)!;
        games.delete(threadId);
        return reply(`🔗 Game ended!\nWords used: ${game.usedWords.size}`);
      }
      return reply('❌ No active game.');
    }

    if (args[0] === 'start') {
      if (games.has(threadId)) return reply('❌ Game already in progress!');
      games.set(threadId, { lastWord: '', usedWords: new Set(), lastPlayer: '' });
      return reply('🔗 Word Chain Started!\nSay any word to begin!');
    }

    const game = games.get(threadId);
    if (!game) return reply('❌ No active game. Start with: wordchain start');

    const word = args.join('').toLowerCase().trim();
    if (!word || word.length < 2) return reply('❌ Enter a valid word (2+ letters)!');
    if (!/^[a-z]+$/.test(word)) return reply('❌ Letters only!');
    if (game.usedWords.has(word)) return reply('❌ Word already used!');
    if (game.lastPlayer === senderId) return reply('❌ Wait for someone else to play!');

    if (game.lastWord && word[0] !== game.lastWord[game.lastWord.length - 1]) {
      return reply(`❌ Word must start with "${game.lastWord[game.lastWord.length - 1].toUpperCase()}"!`);
    }

    game.usedWords.add(word);
    game.lastWord = word;
    game.lastPlayer = senderId;

    return reply(`🔗 "${word.toUpperCase()}" accepted!\n\nNext word must start with: ${word[word.length - 1].toUpperCase()}\nChain: ${game.usedWords.size} words`);
  },
};
