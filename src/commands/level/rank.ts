import type { Command } from '../../types/index.js';
import { database } from '../../database/index.js';
import { safeGetUserInfo } from '../../lib/apiHelpers.js';

export const command: Command = {
  name: 'rank',
  aliases: ['position', 'standing', 'myrank'],
  description: 'See your rank on the leaderboard',
  category: 'level',
  usage: 'rank [@mention]',
  examples: ['rank', 'rank @user'],
  cooldown: 5000,

  async execute({ api, event, args, reply }) {
    let targetId = ('' + event.senderId).trim();
    
    if (event.messageReply) {
      targetId = ('' + event.messageReply.senderId).trim();
    } else if (event.mentions && Object.keys(event.mentions).length > 0) {
      targetId = ('' + Object.keys(event.mentions)[0]).trim();
    } else if (args[0]) {
      const parsed = args[0].replace(/[^0-9]/g, '');
      targetId = parsed ? ('' + parsed).trim() : ('' + event.senderId).trim();
    }

    try {
      const userInfo = await safeGetUserInfo(api, targetId);
      const userName = userInfo[targetId]?.name || 'Unknown';
      const user = await database.getOrCreateUser(targetId, userName);
      
      if (!user) {
        await reply(`❌ Could not fetch user data`);
        return;
      }

      const leaderboard = await database.getLeaderboard(100);
      const rank = leaderboard.findIndex(u => u.id === targetId) + 1 || leaderboard.length + 1;
      const xpNext = (user.level + 1) * 100;
      const progress = Math.round((user.xp / xpNext) * 10);
      const bar = '█'.repeat(progress) + '░'.repeat(10 - progress);

      let emoji = '📊';
      if (rank === 1) emoji = '🥇';
      else if (rank === 2) emoji = '🥈';
      else if (rank === 3) emoji = '🥉';
      else if (rank <= 10) emoji = '🏅';

      await reply(`${emoji} RANK
━━━━━━━━━━━━━━━
👤 ${userName}
#️⃣ Rank: #${rank}
━━━━━━━━━━━━━━━
🏆 Lvl ${user.level}
⭐ ${user.xp}/${xpNext} XP
[${bar}]
━━━━━━━━━━━━━━━`);
    } catch (error) {
      await reply(`❌ Failed to get rank`);
    }
  },
};
