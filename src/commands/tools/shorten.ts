import axios from 'axios';
import type { Command, CommandContext } from '../../types/index.js';

export const command: Command = {
  name: 'shorten',
  aliases: ['shorturl', 'tinyurl'],
  description: 'Shorten a long URL using TinyURL',
  category: 'tools',
  usage: 'shorten <url>',
  examples: ['shorten https://example.com/very/long/url'],
  cooldown: 5000,

  async execute(context: CommandContext): Promise<void> {
    const { args, reply } = context;

    if (!args.length) {
      await reply('❌ Please provide a URL to shorten.');
      return;
    }

    const url = args[0];

    try {
      const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
      
      if (response.data) {
        await reply(`🔗 *URL Shortened*\n\nOriginal: ${url}\nShort: ${response.data}`);
      } else {
        await reply('❌ Failed to shorten URL.');
      }
    } catch (error) {
      await reply('❌ An error occurred while shortening the URL.');
    }
  },
};

