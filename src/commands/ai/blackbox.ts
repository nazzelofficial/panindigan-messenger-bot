import type { Command, CommandContext } from '../../types/index.js';
import axios from 'axios';

const command: Command = {
  name: 'blackbox',
  aliases: ['bb', 'ai'],
  description: 'Ask Blackbox AI (Programming focused)',
  category: 'ai',
  usage: 'blackbox <question>',
  examples: ['blackbox how to center a div', 'blackbox explain react hooks'],
  cooldown: 10000,

  async execute(context: CommandContext): Promise<void> {
    const { args, reply, event } = context;

    if (!args.length) {
      await reply('❌ Please provide a question.\nUsage: blackbox <question>');
      return;
    }

    const prompt = args.join(' ');
    await reply('🤖 Thinking...');

    try {
      // Using a known free endpoint for Blackbox or similar
      // Note: Direct API might change. Using a common reverse-engineered endpoint pattern.
      // If this fails, we can fallback to a simple response.
      
      const response = await axios.post('https://useblackbox.io/chat-request-v4', {
        text: prompt,
        allMessages: [{ user: prompt }],
        stream: false,
        clickedContinue: false,
        uuid: "user-" + event.senderID
      }, {
        headers: {
            'Content-Type': 'application/json',
            'Origin': 'https://www.useblackbox.io',
            'Referer': 'https://www.useblackbox.io/'
        }
      });

      const answer = response.data.response[0][0];

      if (!answer) {
        throw new Error('No response');
      }

      // Split if too long
      if (answer.length > 2000) {
        const chunks = answer.match(/.{1,2000}/g) || [];
        for (const chunk of chunks) {
            await reply(chunk);
            await new Promise(r => setTimeout(r, 1000));
        }
      } else {
        await reply(answer);
      }

    } catch (error) {
      console.error('Blackbox error:', error);
      await reply('❌ Failed to get response from Blackbox AI. Try again later.');
    }
  }
};

export default command;
