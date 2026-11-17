import type { Command, CommandContext } from '../../types/index.js';
import { database } from '../../database/index.js';

const command: Command = {
  name: 'flip',
  aliases: ['doubleornothing', 'don', '2x'],
  description: 'Double or nothing coin flip',
  category: 'economy',
  usage: 'flip <amount>',
  examples: ['flip 100', 'flip 500'],
  cooldown: 30000,

  async execute(context: CommandContext): Promise<void> {
    const { args, reply, event, prefix } = context;
    const userId = event.senderId;

    if (args.length === 0) {
      await reply(`╭─────────────────╮
│ 🪙 DOUBLE OR NOTHING
╰─────────────────╯

Usage: ${prefix}flip <amount>
Risk your coins for 2x!

50/50 chance to double or lose all`);
      return;
    }

    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 10) {
      await reply(`❌ Minimum bet is 10 coins!`);
      return;
    }

    const balance = await database.getUserCoins(userId);
    if (balance < amount) {
      await reply(`❌ You don't have ${amount} coins! Balance: ${balance}`);
      return;
    }

    const win = Math.random() >= 0.5;

    if (win) {
      await database.addCoins(userId, amount, 'gambling', 'Double or nothing win');
      const newBalance = await database.getUserCoins(userId);
      await reply(`╭─────────────────╮
│ 🎉 DOUBLED!
╰─────────────────╯

Result: ✅ WIN!
💰 +${amount.toLocaleString()} coins
💳 Balance: ${newBalance.toLocaleString()}`);
    } else {
      await database.removeCoins(userId, amount, 'gambling', 'Double or nothing loss');
      const newBalance = await database.getUserCoins(userId);
      await reply(`╭─────────────────╮
│ 💔 LOST!
╰─────────────────╯

Result: ❌ LOST
💸 -${amount.toLocaleString()} coins
💳 Balance: ${newBalance.toLocaleString()}`);
    }
  }
};

export default command;
