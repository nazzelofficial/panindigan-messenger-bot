import type { Command } from '../../types/index.js';
import { database } from '../../database/index.js';

export const command: Command = {
  name: 'coinflip',
  aliases: ['cf', 'flip', 'headsortails'],
  description: 'Flip a coin and bet on the outcome',
  category: 'economy',
  usage: 'coinflip <heads|tails> <bet>',
  examples: ['coinflip heads 100', 'cf tails 500'],
  cooldown: 5000,

  async execute({ api, event, args, reply, prefix }) {
    const userId = ('' + event.senderId).trim();

    if (args.length < 2) {
      await reply(`╭───────────────────╮
│   🪙 COINFLIP    │
╰───────────────────╯
📌 ${prefix}cf <h/t> <bet>
💵 Min: 10 coins
🎲 Win = 2x bet

╭─ Example ─╮
│ ${prefix}cf h 100 │
│ ${prefix}cf t 500 │
╰──────────╯`);
      return;
    }

    const choice = args[0].toLowerCase();
    const bet = parseInt(args[1], 10);

    if (choice !== 'heads' && choice !== 'tails' && choice !== 'h' && choice !== 't') {
      await reply(`❌ Choose 'h' (heads) or 't' (tails)`);
      return;
    }

    const normalizedChoice = (choice === 'h' || choice === 'heads') ? 'heads' : 'tails';

    if (isNaN(bet) || bet < 10) {
      await reply(`❌ Min bet: 10 coins`);
      return;
    }

    if (bet > 10000) {
      await reply(`❌ Max bet: 10,000 coins`);
      return;
    }

    const currentCoins = await database.getUserCoins(userId);
    if (currentCoins < bet) {
      await reply(`╭───────────────────╮
│   💸 NO COINS    │
╰───────────────────╯
💰 Have: ${currentCoins.toLocaleString()}
💵 Bet: ${bet.toLocaleString()}`);
      return;
    }

    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = result === normalizedChoice;
    const winnings = won ? bet * 2 : 0;

    let newBalance = 0;
    if (won) {
      const addResult = await database.addCoins(userId, bet, 'game_win', 'Coinflip win');
      newBalance = addResult.newBalance;
    } else {
      const removeResult = await database.removeCoins(userId, bet, 'game_loss', 'Coinflip loss');
      newBalance = removeResult.newBalance;
    }

    const coinEmoji = result === 'heads' ? '🪙' : '💿';
    const resultEmoji = won ? '🎉' : '😢';
    const pickEmoji = normalizedChoice === 'heads' ? '🪙' : '💿';

    await reply(`╭───────────────────╮
│  ${coinEmoji} COINFLIP ${resultEmoji} │
╰───────────────────╯
${pickEmoji} Pick: ${normalizedChoice.toUpperCase()}
${coinEmoji} Got: ${result.toUpperCase()}

${won 
  ? `✅ WON +${winnings.toLocaleString()}` 
  : `❌ Lost -${bet.toLocaleString()}`}
💵 Bal: ${newBalance.toLocaleString()}`);
  },
};
