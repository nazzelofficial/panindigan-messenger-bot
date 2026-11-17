import type { Command, CommandContext } from '../../types/index.js';
import { database } from '../../database/index.js';

const symbols = ['💎', '⭐', '🍀', '💰', '🎁', '❌'];
const payouts: Record<string, number> = {
  '💎💎💎': 100,
  '⭐⭐⭐': 50,
  '🍀🍀🍀': 30,
  '💰💰💰': 25,
  '🎁🎁🎁': 20,
};

const command: Command = {
  name: 'scratchcard',
  aliases: ['sc', 'scratch2', 'luckyscratch'],
  description: 'Play scratch card lottery',
  category: 'economy',
  usage: 'scratchcard',
  examples: ['scratchcard'],
  cooldown: 60000,

  async execute(context: CommandContext): Promise<void> {
    const { reply, event } = context;
    const userId = event.senderId;

    const card = [
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
    ];

    const cardKey = card.join('');
    const payout = payouts[cardKey] || 0;

    if (payout > 0) {
      await database.addCoins(userId, payout, 'gambling', 'Scratch card win');
    }

    const balance = await database.getUserCoins(userId);

    let resultMsg = payout > 0 
      ? `✅ WINNER! +${payout} coins` 
      : `❌ No match. Try again!`;

    await reply(`╭─────────────────╮
│ 🎫 SCRATCH CARD
╰─────────────────╯

┌───┬───┬───┐
│ ${card[0]} │ ${card[1]} │ ${card[2]} │
└───┴───┴───┘

${resultMsg}
💳 Balance: ${balance.toLocaleString()}`);
  }
};

export default command;
