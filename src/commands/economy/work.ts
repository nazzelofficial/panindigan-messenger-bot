import type { Command } from '../../types/index.js';
import { database } from '../../database/index.js';
import { safeGetUserInfo } from '../../lib/apiHelpers.js';

const jobs = [
  { name: 'Programmer', emoji: '💻', minPay: 50, maxPay: 200 },
  { name: 'Chef', emoji: '👨‍🍳', minPay: 40, maxPay: 150 },
  { name: 'Doctor', emoji: '👨‍⚕️', minPay: 80, maxPay: 250 },
  { name: 'Teacher', emoji: '👨‍🏫', minPay: 30, maxPay: 120 },
  { name: 'Artist', emoji: '🎨', minPay: 25, maxPay: 180 },
  { name: 'Musician', emoji: '🎵', minPay: 35, maxPay: 200 },
  { name: 'Driver', emoji: '🚗', minPay: 30, maxPay: 100 },
  { name: 'Gardener', emoji: '🌱', minPay: 20, maxPay: 80 },
  { name: 'Security', emoji: '🛡️', minPay: 40, maxPay: 130 },
  { name: 'Streamer', emoji: '📺', minPay: 10, maxPay: 300 },
  { name: 'Influencer', emoji: '📱', minPay: 15, maxPay: 250 },
  { name: 'Writer', emoji: '✍️', minPay: 35, maxPay: 160 },
];

const workMessages = [
  "worked hard and earned",
  "completed a job and received",
  "finished a task and got paid",
  "delivered excellent work and earned",
  "impressed the boss and received",
];

export const command: Command = {
  name: 'work',
  aliases: ['job', 'earn'],
  description: 'Work to earn coins',
  category: 'economy',
  usage: 'work',
  examples: ['work'],
  cooldown: 60000,

  async execute({ api, event, reply, prefix }) {
    const senderId = ('' + event.senderId).trim();

    try {
      const userInfo = await safeGetUserInfo(api, senderId);
      const userName = userInfo[senderId]?.name || 'Worker';
      const user = await database.getOrCreateUser(senderId, userName);
      
      if (!user) {
        await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ❌ 𝗘𝗥𝗥𝗢𝗥 ❌     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

⚠️ Could not access your account.
Please try again later.`);
        return;
      }

      const job = jobs[Math.floor(Math.random() * jobs.length)];
      const earnings = Math.floor(Math.random() * (job.maxPay - job.minPay + 1)) + job.minPay;
      const message = workMessages[Math.floor(Math.random() * workMessages.length)];
      
      const result = await database.addCoins(senderId, earnings, 'game_win', `Work as ${job.name}`);
      
      if (!result.success) {
        await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ❌ 𝗘𝗥𝗥𝗢𝗥 ❌     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

⚠️ Something went wrong.
Please try again later.`);
        return;
      }

      const tipEmoji = earnings > 150 ? '🎉' : earnings > 100 ? '💪' : '👍';

      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ${job.emoji} 𝗪𝗢𝗥𝗞 ${job.emoji}     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌── 💼 𝗝𝗼𝗯 𝗖𝗼𝗺𝗽𝗹𝗲𝘁𝗲 ──┐
│ ${job.emoji} Job: ${job.name}
│ 💰 Earned: +${earnings} coins
│ 🏦 Balance: ${result.newBalance.toLocaleString()} coins
└─────────────────────────────┘

${tipEmoji} You ${message} ${earnings} coins!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️ Work again in 1 minute
💡 ${prefix}balance ➜ Check wallet`);

    } catch (error) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ❌ 𝗘𝗥𝗥𝗢𝗥 ❌     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

⚠️ Work failed. Please try again.`);
    }
  },
};
