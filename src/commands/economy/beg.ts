import type { Command } from '../../types/index.js';
import { database } from '../../database/index.js';
import { safeGetUserInfo } from '../../lib/apiHelpers.js';

const donors = [
  { name: 'A kind stranger', emoji: '😊' },
  { name: 'A wealthy merchant', emoji: '🧔' },
  { name: 'A generous noble', emoji: '👑' },
  { name: 'A mysterious traveler', emoji: '🎭' },
  { name: 'A friendly farmer', emoji: '👨‍🌾' },
  { name: 'A lucky gambler', emoji: '🎰' },
  { name: 'A retired pirate', emoji: '🏴‍☠️' },
  { name: 'A cheerful baker', emoji: '🧁' },
  { name: 'A wandering bard', emoji: '🎸' },
  { name: 'A wise wizard', emoji: '🧙' },
];

const failMessages = [
  "Nobody felt generous today...",
  "People just walked past you...",
  "A dog stole your sign!",
  "It started raining and everyone ran away...",
  "Your cardboard sign flew away...",
  "Security asked you to leave...",
  "Everyone was too busy...",
  "The street was empty today...",
];

const successMessages = [
  "felt sorry for you",
  "was feeling generous",
  "remembered being poor once",
  "wanted to spread kindness",
  "saw your sad face",
  "believed in paying it forward",
];

export const command: Command = {
  name: 'beg',
  aliases: ['plead', 'panhandle'],
  description: 'Beg for coins on the street',
  category: 'economy',
  usage: 'beg',
  examples: ['beg'],
  cooldown: 30000,

  async execute({ api, event, reply, prefix }) {
    const senderId = ('' + event.senderId).trim();

    try {
      const userInfo = await safeGetUserInfo(api, senderId);
      const userName = userInfo[senderId]?.name || 'Beggar';
      await database.getOrCreateUser(senderId, userName);

      const isSuccessful = Math.random() > 0.35;

      if (isSuccessful) {
        const donor = donors[Math.floor(Math.random() * donors.length)];
        const message = successMessages[Math.floor(Math.random() * successMessages.length)];
        const amount = Math.floor(Math.random() * 50) + 10;

        const result = await database.addCoins(senderId, amount, 'game_win', 'Begging');

        await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     🙏 𝗕𝗘𝗚𝗚𝗜𝗡𝗚 🙏     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌── 💝 𝗦𝘂𝗰𝗰𝗲𝘀𝘀! ──┐
│ ${donor.emoji} ${donor.name}
│ ${message}!
└─────────────────────────────┘

┌── 💰 𝗥𝗲𝘄𝗮𝗿𝗱 ──┐
│ 🪙 +${amount} coins
│ 🏦 Balance: ${result.newBalance.toLocaleString()}
└────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️ Beg again in 30 seconds`);

      } else {
        const failMessage = failMessages[Math.floor(Math.random() * failMessages.length)];

        await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     😢 𝗕𝗘𝗚𝗚𝗜𝗡𝗚 😢     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌── 💔 𝗡𝗼 𝗟𝘂𝗰𝗸 ──┐
│ ${failMessage}
└─────────────────────────────┘

💡 Don't give up! Try again soon.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️ Beg again in 30 seconds
💼 ${prefix}work ➜ More reliable income`);
      }

    } catch (error) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ❌ 𝗘𝗥𝗥𝗢𝗥 ❌     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

⚠️ Begging failed. Please try again.`);
    }
  },
};
