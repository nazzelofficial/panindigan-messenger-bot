import type { Command, CommandContext } from '../../types/index.js';
import { safeGetUserInfo } from '../../lib/apiHelpers.js';

const command: Command = {
  name: 'simp',
  aliases: ['simpmeter', 'simprate'],
  description: 'Check how much of a simp someone is',
  category: 'fun',
  usage: 'simp [@mention]',
  examples: ['simp', 'simp @user'],

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

    const simpRate = Math.floor(Math.random() * 101);
    const hearts = Math.round(simpRate / 10);
    const simpBar = '💗'.repeat(hearts) + '🖤'.repeat(10 - hearts);

    let verdict = '';
    if (simpRate >= 90) {
      verdict = '🚨 ULTIMATE SIMP DETECTED! 🚨';
    } else if (simpRate >= 70) {
      verdict = '💘 Major simp energy!';
    } else if (simpRate >= 50) {
      verdict = '💕 Moderate simp level';
    } else if (simpRate >= 30) {
      verdict = '💛 Slight simp tendencies';
    } else {
      verdict = '😎 Not a simp at all!';
    }

    await reply(`💗 *Simp Rate* 💗\n\n👤 ${targetName}\n\n${simpBar}\n\n📊 Simp Level: ${simpRate}%\n\n${verdict}`);
  }
};

export default command;
