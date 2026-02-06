import axios from 'axios';
import type { Command, CommandContext } from '../../types/index.js';

const command: Command = {
  name: 'cat',
  aliases: ['kitten', 'meow'],
  description: 'Get a random cat image',
  category: 'fun',
  usage: 'cat',
  examples: ['cat'],
  cooldown: 5000,

  async execute(context: CommandContext): Promise<void> {
    const { reply } = context;

    try {
      const response = await axios.get('https://api.thecatapi.com/v1/images/search');
      const data = response.data[0];
      const imageUrl = data.url;

      const stream = await axios.get(imageUrl, { responseType: 'stream' });
      
      await reply({
        body: '🐱 Meow!',
        attachment: stream.data
      });

    } catch (error) {
      await reply('❌ An error occurred while fetching a cat image.');
    }
  }
};

export default command;
