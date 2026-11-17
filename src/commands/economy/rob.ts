import type { Command } from '../../types/index.js';
import { database } from '../../database/index.js';
import { safeGetUserInfo } from '../../lib/apiHelpers.js';

export const command: Command = {
  name: 'rob',
  aliases: ['steal', 'heist'],
  description: 'Attempt to rob coins from another user',
  category: 'economy',
  usage: 'rob <@mention>',
  examples: ['rob @user'],
  cooldown: 120000,

  async execute({ api, event, args, reply, prefix }) {
    const senderId = ('' + event.senderId).trim();
    let targetId = '';

    if (event.messageReply) {
      targetId = ('' + event.messageReply.senderId).trim();
    } else if (event.mentions && Object.keys(event.mentions).length > 0) {
      targetId = ('' + Object.keys(event.mentions)[0]).trim();
    } else if (args[0]) {
      const parsed = args[0].replace(/[^0-9]/g, '');
      if (parsed) {
        targetId = ('' + parsed).trim();
      }
    }

    if (!targetId) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     🔫 𝗥𝗢𝗕 🔫     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

⚠️ You need to specify who to rob!

┌── 𝗨𝘀𝗮𝗴𝗲 ──┐
│ ${prefix}rob @user
│ Reply to someone with ${prefix}rob
└──────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ Be careful! You might get caught!`);
      return;
    }

    if (targetId === senderId) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     🤔 𝗪𝗛𝗔𝗧? 🤔     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

😅 You can't rob yourself!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Try: ${prefix}rob @someone`);
      return;
    }

    try {
      const [robberInfo, targetInfo] = await Promise.all([
        safeGetUserInfo(api, senderId),
        safeGetUserInfo(api, targetId)
      ]);

      const robberName = robberInfo[senderId]?.name || 'Robber';
      const targetName = targetInfo[targetId]?.name || 'Target';

      const [robber, target] = await Promise.all([
        database.getOrCreateUser(senderId, robberName),
        database.getOrCreateUser(targetId, targetName)
      ]);

      if (!robber || !target) {
        await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ❌ 𝗘𝗥𝗥𝗢𝗥 ❌     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

⚠️ Could not find user data.`);
        return;
      }

      const robberCoins = robber.coins ?? 0;
      const targetCoins = target.coins ?? 0;

      if (robberCoins < 100) {
        await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     💸 𝗧𝗢𝗢 𝗣𝗢𝗢𝗥 💸     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

⚠️ You need at least 100 coins to attempt a robbery!
📍 You have: ${robberCoins} coins

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 ${prefix}work ➜ Earn coins first`);
        return;
      }

      if (targetCoins < 50) {
        await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     😢 𝗧𝗢𝗢 𝗣𝗢𝗢𝗥 😢     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

⚠️ ${targetName} is too poor to rob!
📍 They have less than 50 coins.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Find a richer target!`);
        return;
      }

      const successChance = Math.random();
      const isSuccessful = successChance > 0.45;

      if (isSuccessful) {
        const maxSteal = Math.min(Math.floor(targetCoins * 0.3), 500);
        const minSteal = Math.floor(maxSteal * 0.3);
        const stolenAmount = Math.floor(Math.random() * (maxSteal - minSteal + 1)) + minSteal;

        await Promise.all([
          database.addCoins(senderId, stolenAmount, 'game_win', `Robbed ${targetName}`),
          database.removeCoins(targetId, stolenAmount, 'game_loss', `Robbed by ${robberName}`)
        ]);

        const newBalance = robberCoins + stolenAmount;

        await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     🎭 𝗥𝗢𝗕𝗕𝗘𝗥𝗬 𝗦𝗨𝗖𝗖𝗘𝗦𝗦 🎭     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌── 💰 𝗛𝗲𝗶𝘀𝘁 𝗥𝗲𝘀𝘂𝗹𝘁𝘀 ──┐
│ 🎯 Target: ${targetName}
│ 💵 Stolen: +${stolenAmount} coins
│ 🏦 Balance: ${newBalance.toLocaleString()} coins
└─────────────────────────────┘

🥷 You successfully robbed ${targetName}!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️ Cooldown: 2 minutes`);

      } else {
        const fine = Math.floor(robberCoins * 0.2);
        await database.removeCoins(senderId, fine, 'game_loss', `Failed robbery on ${targetName}`);
        const newBalance = robberCoins - fine;

        await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     🚔 𝗖𝗔𝗨𝗚𝗛𝗧! 🚔     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌── ⚠️ 𝗙𝗮𝗶𝗹𝗲𝗱 𝗛𝗲𝗶𝘀𝘁 ──┐
│ 🎯 Target: ${targetName}
│ 💸 Fine: -${fine} coins
│ 🏦 Balance: ${newBalance.toLocaleString()} coins
└─────────────────────────────┘

👮 You got caught trying to rob ${targetName}!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️ Cooldown: 2 minutes`);
      }

    } catch (error) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ❌ 𝗘𝗥𝗥𝗢𝗥 ❌     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

⚠️ Robbery failed. Please try again.`);
    }
  },
};
