import type { Command } from '../../types/index.js';
import { safeGetUserInfo } from '../../lib/apiHelpers.js';
import { decorations } from '../../lib/messageFormatter.js';

export const command: Command = {
  name: 'ship',
  aliases: ['match', 'couple'],
  description: 'Ship two users together!',
  category: 'fun',
  usage: 'ship <@user1> <@user2>',
  examples: ['ship @user1 @user2', 'ship me @someone'],
  cooldown: 5000,

  async execute({ api, event, args, reply, prefix }) {
    const mentions = Object.keys(event.mentions || {});
    let user1Id = String(event.senderId);
    let user2Id = '';

    if (mentions.length >= 2) {
      user1Id = String(mentions[0]);
      user2Id = String(mentions[1]);
    } else if (mentions.length === 1) {
      user2Id = String(mentions[0]);
    } else if (event.messageReply) {
      user2Id = String(event.messageReply.senderId);
    } else {
      await reply(`🚢 『 SHIP BUILDER 』 🚢
═══════════════════════════
${decorations.sparkle} Ship two people together!
═══════════════════════════

◈ USAGE
═══════════════════════════
➤ ${prefix}ship @user1 @user2
➤ Reply to someone's message

◈ EXAMPLE
═══════════════════════════
➤ ${prefix}ship @John @Jane`);
      return;
    }

    if (user1Id === user2Id) {
      await reply(`💕 『 SELF LOVE 』 💕
═══════════════════════════
🌟 100% Self-Compatibility!
Self-love is the best love!
═══════════════════════════`);
      return;
    }

    try {
      const userInfo = await safeGetUserInfo(api, [user1Id, user2Id]);
      const name1 = userInfo[user1Id]?.name || 'User 1';
      const name2 = userInfo[user2Id]?.name || 'User 2';

      const seed = (user1Id + user2Id).split('').sort().join('');
      const hash = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      const percentage = (hash % 101);

      const filledHearts = Math.round(percentage / 10);
      const hearts = '❤️'.repeat(filledHearts) + '🖤'.repeat(10 - filledHearts);

      let status = '';
      let statusEmoji = '';
      if (percentage >= 90) {
        status = 'Soulmates! Perfect Match!';
        statusEmoji = '💑';
      } else if (percentage >= 70) {
        status = 'Love is in the air!';
        statusEmoji = '💖';
      } else if (percentage >= 50) {
        status = 'Worth a shot!';
        statusEmoji = '💛';
      } else if (percentage >= 30) {
        status = 'Could work with effort!';
        statusEmoji = '🤔';
      } else {
        status = 'Better as friends?';
        statusEmoji = '💔';
      }

      const shipName = name1.slice(0, Math.ceil(name1.length / 2)) + 
                       name2.slice(Math.floor(name2.length / 2));

      await reply(`🚢 『 SHIP BUILDER 』 🚢
═══════════════════════════

👤 ${name1}
    ⚓ × ⚓
👤 ${name2}

═══════════════════════════
${hearts}
═══════════════════════════

💘 Compatibility: ${percentage}%
${statusEmoji} ${status}

🏷️ Ship Name: ${shipName}

═══════════════════════════
${decorations.sparkle} Sail the seas of love!`);
    } catch (error) {
      await reply(`${decorations.fire} 『 ERROR 』
═══════════════════════════
❌ Failed to calculate ship`);
    }
  },
};
