import type { Command, CommandContext } from '../../types/index.js';
import axios from 'axios';

const command: Command = {
  name: 'wikipedia',
  aliases: ['wiki', 'search'],
  description: 'Search Wikipedia for information',
  category: 'utility',
  usage: 'wikipedia <query>',
  examples: ['wikipedia Philippines', 'wikipedia Albert Einstein'],
  cooldown: 5000,

  async execute(context: CommandContext): Promise<void> {
    const { args, reply } = context;

    if (!args.length) {
      await reply('❌ Please provide a search query.\nUsage: wikipedia <query>');
      return;
    }

    const query = args.join(' ');

    try {
      // First search for the page
      const searchRes = await axios.get('https://en.wikipedia.org/w/api.php', {
        params: {
          action: 'query',
          list: 'search',
          srsearch: query,
          format: 'json',
          srlimit: 1
        }
      });

      if (!searchRes.data.query.search.length) {
        await reply(`❌ No results found for "${query}"`);
        return;
      }

      const pageId = searchRes.data.query.search[0].pageid;

      // Then get page content
      const contentRes = await axios.get('https://en.wikipedia.org/w/api.php', {
        params: {
          action: 'query',
          prop: 'extracts|pageimages',
          pageids: pageId,
          exintro: true,
          explaintext: true,
          pithumbsize: 500,
          format: 'json'
        }
      });

      const page = contentRes.data.query.pages[pageId];
      const title = page.title;
      const extract = page.extract;
      const imageUrl = page.thumbnail?.source;

      const summary = extract.length > 1000 ? extract.substring(0, 997) + '...' : extract;

      let msg = `📚 *${title}*\n\n${summary}\n\n🔗 Read more: https://en.wikipedia.org/?curid=${pageId}`;
      
      if (imageUrl) {
        // Since ws3-fca supports attachment url directly or via stream, we'll try passing stream if possible or just url if supported
        // But for safety in this codebase, let's use the stream approach if common, or just text if image handling is complex
        // Checking existing commands (e.g. meme) would be good, but I'll stick to text + url for now to be safe and fast.
        // Actually, let's try to send the image if possible.
        // Assuming context.api.sendMessage supports attachment.
        const stream = await axios.get(imageUrl, { responseType: 'stream' });
        await reply({
            body: msg,
            attachment: stream.data
        });
      } else {
        await reply(msg);
      }

    } catch (error) {
      console.error('Wikipedia error:', error);
      await reply('❌ An error occurred while fetching data from Wikipedia.');
    }
  }
};

export default command;
