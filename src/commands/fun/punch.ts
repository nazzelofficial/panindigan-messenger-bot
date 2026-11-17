import type { Command, CommandContext } from '../../types/index.js';
import { safeGetUserInfo } from '../../lib/apiHelpers.js';

const punchMessages = [
  '{user1} throws a punch at {user2} 👊',
  '{user1} punches {user2} playfully 🥊',
  '{user1} gives {user2} a friendly punch on the arm 💪',
  '{user1} air punches near {user2} 🌪️',
  '{user1} does a slow-mo punch towards {user2} 🎬',
  '{user1} shadow boxes with {user2} 🥷',
  '{user1} gives {user2} a superhero punch 🦸',
  '{user1} misses the punch and falls over 😅',
];

const command: Command = {
  name: 'punch',
  aliases: ['suntok', 'hit'],
  description: 'Punch someone playfully',
  category: 'fun',
  usage: 'punch [@mention]',
  examples: ['punch @user'],

  async execute(context: CommandContext): Promise<void> {
    const { api, event, reply } = context;
    
    let puncherId = ('' + event.senderId).trim();
    let targetId = puncherId;
    let puncherName = 'Someone';
    let targetName = 'themselves';

    if (event.mentions && Object.keys(event.mentions).length > 0) {
      targetId = ('' + Object.keys(event.mentions)[0]).trim();
    } else if (event.messageReply) {
      targetId = ('' + event.messageReply.senderId).trim();
    }

    try {
      const userInfo = await safeGetUserInfo(api, [puncherId, targetId]);
      puncherName = userInfo[puncherId]?.name || 'Someone';
      targetName = targetId === puncherId ? 'themselves' : (userInfo[targetId]?.name || 'someone');
    } catch {}

    const message = punchMessages[Math.floor(Math.random() * punchMessages.length)]
      .replace('{user1}', puncherName)
      .replace('{user2}', targetName);

    await reply(`👊 ${message}`);
  }
};

export default command;
