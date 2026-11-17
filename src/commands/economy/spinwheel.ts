import type { Command, CommandContext } from '../../types/index.js';
import { database } from '../../database/index.js';

const wheelSlots = [
  { emoji: '💰', multiplier: 2, name: 'Double' },
  { emoji: '🎁', multiplier: 1.5, name: 'Bonus' },
  { emoji: '💎', multiplier: 5, name: 'Jackpot' },
  { emoji: '⭐', multiplier: 1.2, name: 'Star' },
  { emoji: '🍀', multiplier: 3, name: 'Lucky' },
  { emoji: '💔', multiplier: 0, name: 'Bust' },
  { emoji: '🎲', multiplier: 1, name: 'Even' },
  { emoji: '🌟', multiplier: 4, name: 'Super' },
];

const command: Command = {
  name: 'spinwheel',
  aliases: ['wheel', 'spin2', 'luckywheel'],
  description: 'Spin the wheel for prizes',
  category: 'economy',
  usage: 'spinwheel <amount>',
  examples: ['spinwheel 50', 'spinwheel 100'],
  cooldown: 30000,

  async execute(context: CommandContext): Promise<void> {
    const { args, reply, event, prefix } = context;
    const userId = event.senderId;

    if (args.length === 0) {
      await reply(`╭─────────────────╮
│ 🎡 SPIN WHEEL
╰─────────────────╯

Usage: ${prefix}spinwheel <amount>

Prizes:
💎 5x │ 🌟 4x │ 🍀 3x
💰 2x │ 🎁 1.5x │ ⭐ 1.2x
🎲 1x │ 💔 0x`);
      return;
    }

    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 10) {
      await reply(`❌ Minimum bet is 10 coins!`);
      return;
    }

    const balance = await database.getUserCoins(userId);
    if (balance < amount) {
      await reply(`❌ Insufficient coins! Balance: ${balance}`);
      return;
    }

    await database.removeCoins(userId, amount, 'gambling', 'Spin wheel bet');

    const slot = wheelSlots[Math.floor(Math.random() * wheelSlots.length)];
    const winnings = Math.floor(amount * slot.multiplier);

    if (winnings > 0) {
      await database.addCoins(userId, winnings, 'gambling', `Spin wheel - ${slot.name}`);
    }

    const newBalance = await database.getUserCoins(userId);
    const profit = winnings - amount;
    const profitStr = profit >= 0 ? `+${profit}` : `${profit}`;

    await reply(`╭─────────────────╮
│ 🎡 SPIN RESULT
╰─────────────────╯

Result: ${slot.emoji} ${slot.name}
Multiplier: ${slot.multiplier}x

${profit >= 0 ? '💰' : '💸'} ${profitStr} coins
💳 Balance: ${newBalance.toLocaleString()}`);
  }
};

export default command;
