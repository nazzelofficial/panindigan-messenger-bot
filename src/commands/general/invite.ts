import type { Command } from '../../types/index.js';

export const command: Command = {
  name: 'invite',
  aliases: ['addbot', 'getbot', 'botlink', 'botinvite'],
  description: 'Get information on how to add the bot to your group',
  category: 'general',
  usage: 'invite',
  examples: ['invite'],
  cooldown: 10000,

  async execute({ api, config, reply }) {
    const botId = api.getSession().userId || 'Bot ID';
    const prefix = config.bot.prefix || 'N!';

    await reply(`🚀 INVITE BOT
━━━━━━━━━━━━━━━
1️⃣ Add friend: fb.com/${botId}
2️⃣ Add to group chat
3️⃣ Make bot admin
4️⃣ Type: ${prefix}help
━━━━━━━━━━━━━━━
🆔 ${botId}`);
  },
};

export default command;
