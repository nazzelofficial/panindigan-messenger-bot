import axios from 'axios';
import type { Command, CommandContext } from '../../types/index.js';

const command: Command = {
  name: 'translate',
  aliases: ['trans', 'tr', 'salin'],
  description: 'Translate text to another language',
  category: 'utility',
  usage: 'translate <lang> <text>',
  examples: ['translate tl hello world', 'translate ja good morning', 'translate en magandang umaga'],
  cooldown: 5000,

  async execute(context: CommandContext): Promise<void> {
    const { args, reply } = context;

    if (args.length < 2) {
      await reply('❌ Usage: translate <lang> <text>\nExample: translate tl hello world');
      return;
    }

    const lang = args[0];
    const text = args.slice(1).join(' ');

    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`;
      const response = await axios.get(url);
      
      const result = response.data[0].map((item: any) => item[0]).join('');
      const detectedLang = response.data[2];

      await reply(`🌐 *Translation* (${detectedLang} ➔ ${lang})\n\n${result}`);

    } catch (error) {
      await reply(`❌ Translation failed. Please check the language code (e.g., en, tl, ja, ko, es).`);
    }
  }
};

export default command;
