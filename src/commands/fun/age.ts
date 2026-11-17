import type { Command, CommandContext } from '../../types/index.js';
import { safeGetUserInfo } from '../../lib/apiHelpers.js';

const command: Command = {
  name: 'age',
  aliases: ['guessage', 'howold'],
  description: 'Guess someone\'s mental age (for fun)',
  category: 'fun',
  usage: 'age [@mention]',
  examples: ['age', 'age @user'],

  async execute(context: CommandContext): Promise<void> {
    const { api, event, reply } = context;
    
    let targetId = ('' + event.senderId).trim();

    if (event.mentions && Object.keys(event.mentions).length > 0) {
      targetId = ('' + Object.keys(event.mentions)[0]).trim();
    } else if (event.messageReply) {
      targetId = ('' + event.messageReply.senderId).trim();
    }

    let targetName = 'You';
    try {
      const userInfo = await safeGetUserInfo(api, targetId);
      targetName = userInfo[targetId]?.name || 'You';
    } catch {}

    const mentalAge = Math.floor(Math.random() * 80) + 5;

    let verdict = '';
    let emoji = '';
    if (mentalAge >= 70) {
      emoji = '👴';
      verdict = 'Wise and experienced soul!';
    } else if (mentalAge >= 50) {
      emoji = '🧓';
      verdict = 'Mature and thoughtful!';
    } else if (mentalAge >= 30) {
      emoji = '👨';
      verdict = 'Adult mindset, responsible!';
    } else if (mentalAge >= 18) {
      emoji = '🧑';
      verdict = 'Young adult energy!';
    } else if (mentalAge >= 12) {
      emoji = '👦';
      verdict = 'Teen vibes! Still growing!';
    } else {
      emoji = '👶';
      verdict = 'Child at heart! Pure and innocent!';
    }

    await reply(`${emoji} *Mental Age Test* ${emoji}\n\n👤 ${targetName}\n\n📊 Mental Age: ${mentalAge} years old\n\n${verdict}\n\n*This is just for fun!*`);
  }
};

export default command;
