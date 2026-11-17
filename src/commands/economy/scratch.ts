import type { Command } from '../../types/index.js';
import { database } from '../../database/index.js';

const symbols = ['🍒', '🍋', '🍊', '💎', '⭐', '7️⃣'];

export const command: Command = {
  name: 'scratch',
  aliases: ['scratchcard', 'scratchy'],
  description: 'Buy a scratch card',
  category: 'economy',
  usage: 'scratch',
  examples: ['scratch'],
  cooldown: 10000,
  async execute({ reply, event }) {
    const cost = 25;
    const user = await database.getUserData(event.senderId);
    const balance = user?.coins || 0;
    
    if (balance < cost) return reply(`❌ Need ${cost} coins for a scratch card!`);
    
    await database.updateUserCoins(event.senderId, -cost);
    
    const card = [
      [symbols[Math.floor(Math.random() * 6)], symbols[Math.floor(Math.random() * 6)], symbols[Math.floor(Math.random() * 6)]],
      [symbols[Math.floor(Math.random() * 6)], symbols[Math.floor(Math.random() * 6)], symbols[Math.floor(Math.random() * 6)]],
      [symbols[Math.floor(Math.random() * 6)], symbols[Math.floor(Math.random() * 6)], symbols[Math.floor(Math.random() * 6)]],
    ];
    
    let prize = 0;
    for (const row of card) {
      if (row[0] === row[1] && row[1] === row[2]) {
        if (row[0] === '7️⃣') prize += 500;
        else if (row[0] === '💎') prize += 300;
        else prize += 100;
      }
    }
    
    if (prize > 0) await database.updateUserCoins(event.senderId, prize);
    
    const display = card.map(row => row.join('')).join('\n');
    await reply(`🎫 SCRATCH CARD\n\n${display}\n\n${prize > 0 ? `🎉 You won ${prize} coins!` : '❌ No matches!'}`);
  },
};
