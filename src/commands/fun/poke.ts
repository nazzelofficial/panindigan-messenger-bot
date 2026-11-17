import type { Command, CommandContext } from '../../types/index.js';
import { safeGetUserInfo } from '../../lib/apiHelpers.js';

const pokeMessages = [
  '{user1} pokes {user2} 👉',
  '{user1} gently pokes {user2} on the cheek 😊',
  '{user1} pokes {user2} repeatedly 👉👉👉',
  '{user1} does a surprise poke on {user2} ✨',
  '{user1} playfully pokes {user2} 🎯',
  '{user1} boops {user2} on the nose 👃',
  '{user1} pokes {user2} and runs away 🏃',
  '{user1} uses poke! It\'s super effective on {user2}! ⚡',
];

const command: Command = {
  name: 'poke',
  aliases: ['boop', 'duro'],
  description: 'Poke someone',
  category: 'fun',
  usage: 'poke [@mention]',
  examples: ['poke @user'],

  async execute(context: CommandContext): Promise<void> {
    const { api, event, reply } = context;
    
    let pokerId = ('' + event.senderId).trim();
    let targetId = pokerId;
    let pokerName = 'Someone';
    let targetName = 'themselves';

    if (event.mentions && Object.keys(event.mentions).length > 0) {
      targetId = ('' + Object.keys(event.mentions)[0]).trim();
    } else if (event.messageReply) {
      targetId = ('' + event.messageReply.senderId).trim();
    }

    try {
      const userInfo = await safeGetUserInfo(api, [pokerId, targetId]);
      pokerName = userInfo[pokerId]?.name || 'Someone';
      targetName = targetId === pokerId ? 'themselves' : (userInfo[targetId]?.name || 'someone');
    } catch {}

    const message = pokeMessages[Math.floor(Math.random() * pokeMessages.length)]
      .replace('{user1}', pokerName)
      .replace('{user2}', targetName);

    await reply(`👉 ${message}`);
  }
};

export default command;
