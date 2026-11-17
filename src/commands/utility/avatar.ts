import type { Command } from '../../types/index.js';
import { safeGetUserInfo } from '../../lib/apiHelpers.js';

export const command: Command = {
  name: 'avatar',
  aliases: ['pfp', 'dp', 'profilepic'],
  description: 'Get the profile picture of a user',
  category: 'utility',
  usage: 'avatar [@mention or reply]',
  examples: ['avatar', 'avatar @username'],
  cooldown: 5,

  async execute({ api, event, args, reply }) {
    let targetId = String(event.senderId);
    
    if (event.messageReply) {
      targetId = String(event.messageReply.senderId);
    } else if (event.mentions && Object.keys(event.mentions).length > 0) {
      targetId = String(Object.keys(event.mentions)[0]);
    } else if (args[0]) {
      targetId = String(args[0].replace(/[^0-9]/g, ''));
    }

    if (!targetId) {
      await reply('❌ Please mention someone or reply to their message.');
      return;
    }

    try {
      const userInfo = await safeGetUserInfo(api, targetId);
      const user = userInfo[targetId];
      if (!user) {
        await reply('❌ Could not find user information.');
        return;
      }

      const avatarUrl = user.photoUrl;

      if (!avatarUrl) {
        await reply('❌ Profile picture not available for this user.');
        return;
      }

      await reply(`📷 *Profile Picture*\n\n👤 Name: ${user.name}\n🔗 Link: ${avatarUrl}`);
    } catch (error) {
      await reply('❌ Failed to get profile picture.');
    }
  },
};
