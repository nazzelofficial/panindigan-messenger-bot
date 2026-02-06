import axios from 'axios';
import type { Command, CommandContext } from '../../types/index.js';

const command: Command = {
  name: 'dog',
  aliases: ['doggo', 'puppy'],
  description: 'Get a random dog image',
  category: 'fun',
  usage: 'dog',
  examples: ['dog'],
  cooldown: 5000,

  async execute(context: CommandContext): Promise<void> {
    const { reply } = context;

    try {
      const response = await axios.get('https://dog.ceo/api/breeds/image/random');
      const imageUrl = response.data.message;

      const stream = await axios.get(imageUrl, { responseType: 'stream' });
      
      await reply({
        body: '🐶 Woof!',
        attachment: stream.data
      });

    } catch (error) {
      await reply('❌ An error occurred while fetching a dog image.');
    }
  }
};

export default command;
