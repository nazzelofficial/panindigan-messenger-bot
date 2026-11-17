import type { Command, CommandContext } from '../../types/index.js';
import { database } from '../../database/index.js';
import fmt, { levelMessage, error, createProgressBar, formatNumber } from '../../lib/messageFormatter.js';
import { safeGetUserInfo } from '../../lib/apiHelpers.js';

const command: Command = {
  name: 'level',
  aliases: ['lvl', 'mylevel'],
  description: 'Show your current level and XP',
  category: 'level',
  usage: 'level [@mention|userId]',
  examples: ['level', 'level @user'],
  cooldown: 5000,

  async execute(context: CommandContext): Promise<void> {
    const { api, event, args, reply } = context;
    
    let targetId = ('' + event.senderId).trim();
    
    if (event.mentions && Object.keys(event.mentions).length > 0) {
      targetId = ('' + Object.keys(event.mentions)[0]).trim();
    } else if (args[0] && /^\d+$/.test(args[0])) {
      targetId = ('' + args[0]).trim();
    }
    
    try {
      const userInfo = await safeGetUserInfo(api, targetId);
      const userName = userInfo[targetId]?.name || 'Unknown';
      const userData = await database.getOrCreateUser(targetId, userName);
      
      if (!userData) {
        await reply(error('ERROR', 'Could not fetch user data'));
        return;
      }
      
      const level = userData.level;
      const xp = userData.xp;
      const xpForNextLevel = (level + 1) * 100;
      const progressBar = createProgressBar(xp, xpForNextLevel, 12);
      const rank = await getUserRank(targetId);
      
      const rankEmoji = level >= 50 ? '👑' : level >= 30 ? '💎' : level >= 20 ? '🏆' : level >= 10 ? '⭐' : '🌟';
      const rankMedal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank <= 10 ? '🏅' : '📊';
      
      await reply(levelMessage('LEVEL STATS', 
        `${rankEmoji} ${userName}\n\n${progressBar}`,
        [
          { label: '🏆 Level', value: String(level) },
          { label: '⭐ XP', value: `${xp}/${xpForNextLevel}` },
          { label: `${rankMedal} Rank`, value: `#${rank}` },
          { label: '💬 Messages', value: formatNumber(userData.totalMessages) }
        ]
      ));
    } catch (err) {
      await reply(error('ERROR', 'Failed to fetch level data'));
    }
  }
};

async function getUserRank(userId: string): Promise<number> {
  const leaderboard = await database.getLeaderboard(100);
  const index = leaderboard.findIndex(u => u.id === userId);
  return index >= 0 ? index + 1 : leaderboard.length + 1;
}

export default command;
