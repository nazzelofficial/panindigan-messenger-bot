import type { Command } from '../../types/index.js';
import { database } from '../../database/index.js';

const results = [
  { emoji: '💎', name: 'Diamond', min: 100, max: 200 },
  { emoji: '🥇', name: 'Gold', min: 50, max: 100 },
  { emoji: '🥈', name: 'Silver', min: 25, max: 50 },
  { emoji: '🥉', name: 'Bronze', min: 10, max: 25 },
  { emoji: '🪨', name: 'Stone', min: 1, max: 10 },
];

export const command: Command = {
  name: 'mine',
  aliases: ['dig', 'mina'],
  description: 'Mine for resources',
  category: 'economy',
  usage: 'mine',
  examples: ['mine'],
  cooldown: 30000,
  async execute({ reply, event }) {
    const result = results[Math.floor(Math.random() * results.length)];
    const amount = Math.floor(Math.random() * (result.max - result.min + 1)) + result.min;
    
    await database.updateUserCoins(event.senderId, amount);
    
    await reply(`⛏️ MINING\n\nYou found ${result.emoji} ${result.name}!\n+${amount} coins 💰`);
  },
};
