import type { Command } from '../../types/index.js';
import { database } from '../../database/index.js';
import { safeGetUserInfo } from '../../lib/apiHelpers.js';

export const command: Command = {
  name: 'balance',
  aliases: ['bal', 'coins', 'wallet', 'money'],
  description: 'Check your coin balance and stats',
  category: 'economy',
  usage: 'balance [@mention]',
  examples: ['balance', 'bal', 'coins @user'],
  cooldown: 3000,

  async execute({ api, event, args, reply, prefix }) {
    let targetId = ('' + event.senderId).trim();
    let isSelf = true;
    
    if (event.messageReply) {
      targetId = ('' + event.messageReply.senderId).trim();
      isSelf = targetId === ('' + event.senderId).trim();
    } else if (event.mentions && Object.keys(event.mentions).length > 0) {
      targetId = ('' + Object.keys(event.mentions)[0]).trim();
      isSelf = targetId === ('' + event.senderId).trim();
    } else if (args[0]) {
      const parsed = args[0].replace(/[^0-9]/g, '');
      if (parsed) {
        targetId = ('' + parsed).trim();
        isSelf = targetId === ('' + event.senderId).trim();
      }
    }

    try {
      const userInfo = await safeGetUserInfo(api, targetId);
      const userName = userInfo[targetId]?.name || 'Unknown';
      const user = await database.getOrCreateUser(targetId, userName);
      
      if (!user) {
        await reply(`❌ Could not fetch user data.`);
        return;
      }

      const coins = user.coins ?? 0;
      const streak = user.dailyStreak ?? 0;
      const level = user.level ?? 0;
      const xp = user.xp ?? 0;
      const xpNeeded = (level + 1) * 100;

      const rankEmoji = coins >= 100000 ? '👑' : 
                        coins >= 50000 ? '💎' :
                        coins >= 10000 ? '💰' : 
                        coins >= 1000 ? '🪙' : '💸';

      const shortName = userName.length > 15 ? userName.substring(0, 12) + '...' : userName;

      await reply(`╭─────────────────╮
│ ${rankEmoji} ${isSelf ? 'My Wallet' : shortName}
╰─────────────────╯

🪙 ${coins.toLocaleString()} coins
🏆 Level ${level} • XP ${xp}/${xpNeeded}
🔥 Streak: ${streak}x

${isSelf ? `▸ ${prefix}claim - Daily\n▸ ${prefix}slots - Gamble` : ''}`);
    } catch (error) {
      await reply(`❌ Failed to get balance.`);
    }
  },
};
