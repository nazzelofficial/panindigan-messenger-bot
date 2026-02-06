import axios from 'axios';
import type { Command, CommandContext } from '../../types/index.js';

const command: Command = {
  name: 'joke',
  aliases: ['haha', 'funny'],
  description: 'Get a random joke',
  category: 'fun',
  usage: 'joke',
  examples: ['joke'],
  cooldown: 5000,

  async execute(context: CommandContext): Promise<void> {
    const { reply } = context;

    try {
      const response = await axios.get('https://official-joke-api.appspot.com/random_joke');
      const { setup, punchline } = response.data;

      await reply(`😂 *JOKE*\n\n${setup}\n\n||${punchline}||`);

    } catch (error) {
      await reply('❌ An error occurred while fetching a joke.');
    }
  }
};

export default command;
