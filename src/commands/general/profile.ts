import type { Command, CommandContext } from '../../types/index.js';
import { database } from '../../database/index.js';
import { safeGetUserInfo } from '../../lib/apiHelpers.js';

const command: Command = {
  name: 'profile',
  aliases: ['me', 'myprofile'],
  description: 'Display your profile or another user\'s profile',
  category: 'general',
  usage: 'profile [@mention|userId]',
  examples: ['profile', 'profile @user'],
  cooldown: 8000,

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
      const info = userInfo[targetId];
      
      if (!info) {
        await reply(`❌ User not found`);
        return;
      }
      
      const userData = await database.getOrCreateUser(targetId, info.name);
      const lvl = userData?.level || 0;
      const xp = userData?.xp || 0;
      const xpNext = (lvl + 1) * 100;
      const progress = Math.round((xp / xpNext) * 10);
      const bar = '█'.repeat(progress) + '░'.repeat(10 - progress);
      const gender = info.gender === '2' ? '♂️' : info.gender === '1' ? '♀️' : '⚪';
      
      await reply(`👑 PROFILE
━━━━━━━━━━━━━━━
👤 ${info.name}
🆔 ${targetId}
${gender} Gender
━━━━━━━━━━━━━━━
🏆 Level ${lvl}
⭐ ${xp}/${xpNext} XP
[${bar}]
💬 ${userData?.totalMessages || 0} msgs
━━━━━━━━━━━━━━━`);
    } catch (error) {
      await reply(`❌ Failed to fetch`);
    }
  }
};

export default command;
