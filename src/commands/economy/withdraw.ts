import type { Command } from '../../types/index.js';
import { database } from '../../database/index.js';

export const command: Command = {
  name: 'withdraw',
  aliases: ['with', 'wd'],
  description: 'Withdraw coins from bank',
  category: 'economy',
  usage: 'withdraw <amount/all>',
  examples: ['withdraw 100', 'withdraw all'],
  cooldown: 5000,
  async execute({ reply, args, event }) {
    if (!args.length) return reply('❌ How much to withdraw? Use: withdraw <amount>');
    
    const bankBalance = Number(await database.getSetting(`bank_${event.senderId}`)) || 0;
    
    let amount: number;
    if (args[0].toLowerCase() === 'all') {
      amount = bankBalance;
    } else {
      amount = parseInt(args[0]);
    }
    
    if (isNaN(amount) || amount < 1) return reply('❌ Invalid amount!');
    if (amount > bankBalance) return reply(`❌ You only have ${bankBalance} coins in bank!`);
    
    await database.updateUserCoins(event.senderId, amount);
    await database.setSetting(`bank_${event.senderId}`, bankBalance - amount);
    
    await reply(`🏦 WITHDRAWN\n\n+${amount} coins to wallet\n\nBank balance: ${bankBalance - amount} coins`);
  },
};
