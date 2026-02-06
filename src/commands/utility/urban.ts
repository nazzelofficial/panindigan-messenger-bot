import axios from 'axios';
import type { Command, CommandContext } from '../../types/index.js';

const command: Command = {
  name: 'urban',
  aliases: ['slang', 'urbandictionary'],
  description: 'Search for slang definitions on Urban Dictionary',
  category: 'utility',
  usage: 'urban <term>',
  examples: ['urban lol', 'urban yeet'],
  cooldown: 5000,

  async execute(context: CommandContext): Promise<void> {
    const { args, reply } = context;

    if (args.length === 0) {
      await reply('❌ Please provide a term to search.\nUsage: urban <term>');
      return;
    }

    const term = args.join(' ');

    try {
      const response = await axios.get(`https://api.urbandictionary.com/v0/define`, {
        params: { term }
      });

      const list = response.data.list;

      if (!list || list.length === 0) {
        await reply(`❌ No definition found for "${term}".`);
        return;
      }

      const def = list[0];
      const definition = def.definition.replace(/\[/g, '').replace(/\]/g, '');
      const example = def.example.replace(/\[/g, '').replace(/\]/g, '');
      
      let msg = `🏙️ *${def.word}*\n\n${definition}`;
      
      if (example) {
        msg += `\n\n📝 *Example:*\n${example}`;
      }
      
      msg += `\n\n👍 ${def.thumbs_up} | 👎 ${def.thumbs_down}`;
      msg += `\n🔗 ${def.permalink}`;

      await reply(msg);

    } catch (error) {
      await reply('❌ An error occurred while fetching from Urban Dictionary.');
    }
  }
};

export default command;
