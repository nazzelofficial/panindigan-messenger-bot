import axios from 'axios';
import type { Command, CommandContext } from '../../types/index.js';

const command: Command = {
  name: 'define',
  aliases: ['meaning', 'dictionary', 'def'],
  description: 'Get the definition of a word',
  category: 'utility',
  usage: 'define <word>',
  examples: ['define hello', 'define computer'],
  cooldown: 5000,

  async execute(context: CommandContext): Promise<void> {
    const { args, reply } = context;

    if (args.length === 0) {
      await reply('❌ Please provide a word to define.\nUsage: define <word>');
      return;
    }

    const word = args[0];

    try {
      const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      const data = response.data[0];
      const meanings = data.meanings.map((m: any) => {
        const defs = m.definitions.slice(0, 2).map((d: any) => `- ${d.definition}`).join('\n');
        return `*${m.partOfSpeech}*\n${defs}`;
      }).join('\n\n');

      let msg = `📖 *${data.word}*${data.phonetic ? ` (${data.phonetic})` : ''}\n\n${meanings}`;
      
      if (data.sourceUrls && data.sourceUrls.length > 0) {
        msg += `\n\n🔗 ${data.sourceUrls[0]}`;
      }

      await reply(msg);
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        await reply(`❌ No definition found for "${word}".`);
      } else {
        await reply('❌ An error occurred while fetching the definition.');
      }
    }
  }
};

export default command;
