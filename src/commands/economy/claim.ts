import type { Command } from '../../types/index.js';
import { database } from '../../database/index.js';

export const command: Command = {
  name: 'claim',
  aliases: ['daily', 'reward', 'collect'],
  description: 'Claim your daily coins reward',
  category: 'economy',
  usage: 'claim',
  examples: ['claim', 'daily'],
  cooldown: 5000,

  async execute({ api, event, reply, prefix }) {
    const userId = ('' + event.senderId).trim();

    try {
      const result = await database.claimDaily(userId);
      
      if (!result.success) {
        const hoursRemaining = result.nextClaim 
          ? Math.ceil((result.nextClaim.getTime() - Date.now()) / (1000 * 60 * 60))
          : 0;

        await reply(`╭─────────────────╮
│ ⏰ Already Claimed
╰─────────────────╯

🔥 Streak: ${result.streak}x
⏳ Next: ~${hoursRemaining}h`);
        return;
      }

      const user = await database.getOrCreateUser(userId);
      const newBalance = user?.coins ?? result.coins;

      await reply(`╭─────────────────╮
│ 🎁 Daily Claimed!
╰─────────────────╯

🪙 +${result.coins} coins
🔥 Streak: ${result.streak}x
💰 Balance: ${newBalance.toLocaleString()}`);
    } catch (error) {
      await reply(`❌ Failed to claim. Try again.`);
    }
  },
};
