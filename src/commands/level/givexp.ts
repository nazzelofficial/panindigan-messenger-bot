import type { Command } from '../../types/index.js';
import { database } from '../../database/index.js';
import { safeGetUserInfo } from '../../lib/apiHelpers.js';

export const command: Command = {
  name: 'givexp',
  aliases: ['addxp', 'grantxp'],
  description: 'Give XP to a user (Admin only)',
  category: 'level',
  usage: 'givexp <@mention or ID> <amount>',
  examples: ['givexp @user 100', 'givexp 123456789 500'],
  cooldown: 5,
  adminOnly: true,

  async execute({ api, event, args, reply }) {
    if (args.length < 2) {
      await reply('❌ Please provide a user and XP amount.\n\nUsage: givexp <@mention or ID> <amount>');
      return;
    }

    let targetId = String(args[0].replace(/[^0-9]/g, ''));
    
    if (event.messageReply) {
      targetId = String(event.messageReply.senderId);
    } else if (event.mentions && Object.keys(event.mentions).length > 0) {
      targetId = String(Object.keys(event.mentions)[0]);
    }

    const amount = parseInt(args[args.length - 1]);
    
    if (isNaN(amount) || amount <= 0) {
      await reply('❌ Please provide a valid positive number for XP.');
      return;
    }

    if (amount > 10000) {
      await reply('❌ Maximum XP grant is 10,000 per command.');
      return;
    }

    try {
      const userInfo = await safeGetUserInfo(api, targetId);
      const userName = userInfo[targetId]?.name || 'Unknown User';
      
      const result = await database.updateUserXP(targetId, amount);
      
      if (!result) {
        await reply('❌ Failed to grant XP.');
        return;
      }

      let message = `✅ *XP Granted*\n\n`;
      message += `👤 User: ${userName}\n`;
      message += `⭐ XP Given: +${amount}\n`;
      message += `📊 New XP: ${result.user.xp}\n`;
      message += `🎖️ Level: ${result.user.level}`;
      
      if (result.leveledUp) {
        message += `\n\n🎉 They leveled up!`;
      }

      await reply(message);
    } catch (error) {
      await reply('❌ Failed to grant XP.');
    }
  },
};
