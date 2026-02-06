import axios from 'axios';
import type { Command, CommandContext } from '../../types/index.js';

const command: Command = {
  name: 'pinterest',
  aliases: ['pin', 'pinimg'],
  description: 'Search for images on Pinterest',
  category: 'utility',
  usage: 'pinterest <query> [count]',
  examples: ['pinterest cats', 'pinterest anime 5'],
  cooldown: 10000,

  async execute(context: CommandContext): Promise<void> {
    const { args, reply } = context;

    if (args.length === 0) {
      await reply('❌ Please provide a search query.\nUsage: pinterest <query> [count]');
      return;
    }

    let count = 1;
    let query = args.join(' ');

    // Check if last argument is a number for count
    const lastArg = args[args.length - 1];
    if (!isNaN(parseInt(lastArg)) && args.length > 1) {
      count = parseInt(lastArg);
      if (count > 5) count = 5; // Limit to 5 images
      if (count < 1) count = 1;
      query = args.slice(0, -1).join(' ');
    }

    try {
      await reply(`🔍 Searching Pinterest for "${query}"...`);

      // Using a public API for Pinterest search
      // Note: If this API goes down, we might need to switch to scraping or another provider
      const response = await axios.get(`https://api.popcat.xyz/pinterest?q=${encodeURIComponent(query)}`);
      
      const images = response.data;

      if (!images || images.length === 0) {
        await reply(`❌ No results found for "${query}".`);
        return;
      }

      const selectedImages = images.slice(0, count);

      for (const img of selectedImages) {
        const stream = await axios.get(img.image, { responseType: 'stream' });
        await reply({
          body: `📌 Pinterest: ${query}`,
          attachment: stream.data
        });
      }

    } catch (error) {
      await reply('❌ An error occurred while fetching from Pinterest.');
    }
  }
};

export default command;
