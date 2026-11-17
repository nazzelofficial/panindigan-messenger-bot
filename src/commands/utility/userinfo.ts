import type { Command, CommandContext } from '../../types/index.js';
import { database } from '../../database/index.js';
import { safeGetUserInfo } from '../../lib/apiHelpers.js';

const command: Command = {
  name: 'userinfo',
  aliases: ['ui', 'user', 'whois'],
  description: 'Get detailed information about a user',
  category: 'utility',
  usage: 'userinfo [@user]',
  examples: ['userinfo', 'userinfo @someone'],

  async execute(context: CommandContext): Promise<void> {
    const { reply, event, api } = context;
    
    let targetId = event.senderId;
    
    if (event.mentions && Object.keys(event.mentions).length > 0) {
      targetId = Object.keys(event.mentions)[0];
    } else if (event.messageReply?.senderId) {
      targetId = event.messageReply.senderId;
    }
    
    try {
      const userInfo = await safeGetUserInfo(api, targetId);
      const user = userInfo[targetId];
      
      if (!user) {
        await reply('❌ User not found');
        return;
      }
      
      const dbUser = await database.getUser(targetId);
      const gender = user.gender === 1 ? '♀️' : user.gender === 2 ? '♂️' : '⚪';
      
      await reply(`👤 USER INFO
━━━━━━━━━━━━━━━
📛 ${user.name || 'Unknown'}
🆔 ${targetId}
${gender} Gender
━━━━━━━━━━━━━━━
🏆 Lvl ${dbUser?.level || 0}
⭐ ${dbUser?.xp || 0} XP
💬 ${dbUser?.totalMessages || 0} msgs
━━━━━━━━━━━━━━━`);
    } catch (error) {
      await reply('❌ Failed to get info');
    }
  },
};

export default command;
