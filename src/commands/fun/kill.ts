import type { Command, CommandContext } from '../../types/index.js';
import { safeGetUserInfo } from '../../lib/apiHelpers.js';

const killMessages = [
  '{user1} eliminates {user2} with a banana 🍌',
  '{user1} defeats {user2} with the power of friendship 🌈',
  '{user1} roasts {user2} to death with jokes 🎤',
  '{user1} K.O.s {user2} with a pillow 🛏️',
  '{user1} tickles {user2} until they can\'t breathe 😂',
  '{user1} defeats {user2} in a dance battle 💃',
  '{user1} throws confetti at {user2} 🎉 *It was super effective!*',
  '{user2} dodges {user1}\'s attack! No one was harmed! 🛡️',
  '{user1} challenges {user2} to rock paper scissors! 🪨📄✂️',
];

const command: Command = {
  name: 'kill',
  aliases: ['eliminate', 'patay'],
  description: 'Fake kill someone (just for fun)',
  category: 'fun',
  usage: 'kill [@mention]',
  examples: ['kill @user'],

  async execute(context: CommandContext): Promise<void> {
    const { api, event, reply } = context;
    
    let killerId = ('' + event.senderId).trim();
    let targetId = killerId;
    let killerName = 'Someone';
    let targetName = 'themselves';

    if (event.mentions && Object.keys(event.mentions).length > 0) {
      targetId = ('' + Object.keys(event.mentions)[0]).trim();
    } else if (event.messageReply) {
      targetId = ('' + event.messageReply.senderId).trim();
    }

    try {
      const userInfo = await safeGetUserInfo(api, [killerId, targetId]);
      killerName = userInfo[killerId]?.name || 'Someone';
      targetName = targetId === killerId ? 'themselves (???)' : (userInfo[targetId]?.name || 'someone');
    } catch {}

    const message = killMessages[Math.floor(Math.random() * killMessages.length)]
      .replace(/{user1}/g, killerName)
      .replace(/{user2}/g, targetName);

    await reply(`⚔️ ${message}\n\n*This is just for fun! No one was actually harmed!*`);
  }
};

export default command;
