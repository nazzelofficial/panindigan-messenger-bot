import axios from 'axios';
import type { Command, CommandContext } from '../../types/index.js';

const command: Command = {
  name: 'bible',
  aliases: ['verse', 'bibleverse'],
  description: 'Get a bible verse',
  category: 'general',
  usage: 'bible [reference]',
  examples: ['bible', 'bible John 3:16'],
  cooldown: 5000,

  async execute(context: CommandContext): Promise<void> {
    const { args, reply } = context;

    let url = 'https://bible-api.com/';
    if (args.length > 0) {
      url += args.join(' ');
    } else {
      url += '?random=verse';
    }

    try {
      const response = await axios.get(url);
      const data = response.data;

      if (data.error) {
        await reply(`❌ ${data.error}`);
        return;
      }

      let msg = `📖 *${data.reference}*\n\n"${data.text.trim()}"`;
      
      if (data.translation_name) {
        msg += `\n\n- ${data.translation_name}`;
      }

      await reply(msg);

    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        await reply('❌ Verse not found. Please check the reference.');
      } else {
        await reply('❌ An error occurred while fetching the bible verse.');
      }
    }
  }
};

export default command;
