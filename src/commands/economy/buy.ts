import type { Command } from '../../types/index.js';
import { database } from '../../database/index.js';

const items: { [key: string]: { price: number, emoji: string } } = {
  'vip badge': { price: 5000, emoji: '👑' },
  'custom title': { price: 2000, emoji: '🏷️' },
  'lucky charm': { price: 1000, emoji: '🍀' },
  'xp booster': { price: 3000, emoji: '⚡' },
  'mystery box': { price: 1500, emoji: '📦' },
};

export const command: Command = {
  name: 'buy',
  aliases: ['purchase', 'bili'],
  description: 'Buy an item from the shop',
  category: 'economy',
  usage: 'buy <item name>',
  examples: ['buy lucky charm'],
  cooldown: 5000,
  async execute({ reply, args, event }) {
    if (!args.length) return reply('❌ What do you want to buy? Use: shop');
    
    const itemName = args.join(' ').toLowerCase();
    const item = items[itemName];
    
    if (!item) return reply('❌ Item not found! Use: shop to see available items.');
    
    const user = await database.getUserData(event.senderId);
    const balance = user?.coins || 0;
    
    if (balance < item.price) {
      return reply(`❌ Not enough coins!\n\nYou have: ${balance} coins\nItem costs: ${item.price} coins`);
    }
    
    await database.updateUserCoins(event.senderId, -item.price);
    await reply(`✅ PURCHASED!\n\n${item.emoji} ${itemName}\n-${item.price} coins`);
  },
};
