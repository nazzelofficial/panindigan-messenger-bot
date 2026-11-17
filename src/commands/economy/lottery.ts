import type { Command } from '../../types/index.js';
import { database } from '../../database/index.js';

export const command: Command = {
  name: 'lottery',
  aliases: ['lotto', 'jackpotgame'],
  description: 'Buy a lottery ticket',
  category: 'economy',
  usage: 'lottery',
  examples: ['lottery'],
  cooldown: 10000,
  async execute({ reply, event }) {
    const ticketCost = 50;
    const user = await database.getUserData(event.senderId);
    const balance = user?.coins || 0;
    
    if (balance < ticketCost) {
      return reply(`❌ Not enough coins!\n\nTicket costs: ${ticketCost} coins\nYou have: ${balance} coins`);
    }
    
    await database.updateUserCoins(event.senderId, -ticketCost);
    
    const numbers = [
      Math.floor(Math.random() * 10),
      Math.floor(Math.random() * 10),
      Math.floor(Math.random() * 10),
    ];
    
    let prize = 0;
    if (numbers[0] === numbers[1] && numbers[1] === numbers[2]) prize = 5000;
    else if (numbers[0] === numbers[1] || numbers[1] === numbers[2] || numbers[0] === numbers[2]) prize = 200;
    else if (numbers.includes(7)) prize = 100;
    
    if (prize > 0) {
      await database.updateUserCoins(event.senderId, prize);
    }
    
    await reply(`🎰 LOTTERY\n\n${numbers.join(' - ')}\n\n${prize > 0 ? `🎉 You won ${prize} coins!` : '❌ No luck this time!'}`);
  },
};
