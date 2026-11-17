import type { Command } from '../../types/index.js';
const games = new Map<string, string[]>();
export const command: Command = { name: 'wordassociation', aliases: ['wa', 'assoc'], description: 'Word association game', category: 'games', usage: 'wordassociation <word>', examples: ['wordassociation cat'], cooldown: 2000,
  async execute({ reply, args, event }) { const tid = event.threadId; if (!args.length) { games.set(tid, []); return reply('🔗 WORD ASSOCIATION\n\nSay any word!'); } const word = args[0].toLowerCase(); const history = games.get(tid) || []; if (history.includes(word)) return reply('❌ Word already used!'); history.push(word); games.set(tid, history); await reply(`🔗 "${word}" → (${history.length} words)`); },
};
