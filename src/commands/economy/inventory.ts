import type { Command } from '../../types/index.js';
import { database } from '../../database/index.js';

export const command: Command = {
  name: 'inventory',
  aliases: ['inv', 'bag', 'items'],
  description: 'View your inventory',
  category: 'economy',
  usage: 'inventory',
  examples: ['inventory'],
  cooldown: 5000,
  async execute({ reply, event }) {
    const items = await database.getSetting(`inventory_${event.senderId}`) || [];
    
    if (!Array.isArray(items) || items.length === 0) {
      return reply('🎒 INVENTORY\n\nYour inventory is empty!\n\n💡 Buy items from the shop.');
    }
    
    let invMsg = '🎒 INVENTORY\n\n';
    items.forEach((item: string) => {
      invMsg += `• ${item}\n`;
    });
    
    await reply(invMsg);
  },
};
