import axios from 'axios';
import type { Command, CommandContext } from '../../types/index.js';

export const command: Command = {
  name: 'qrcode',
  aliases: ['qr'],
  description: 'Generate a QR code from text',
  category: 'tools',
  usage: 'qrcode <text>',
  examples: ['qrcode Hello World'],
  cooldown: 5000,

  async execute(context: CommandContext): Promise<void> {
    const { args, reply } = context;

    if (!args.length) {
      await reply('❌ Please provide text to convert to QR Code.');
      return;
    }

    const text = args.join(' ');
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(text)}`;

    try {
      // Verify image exists/loads
      await axios.get(url);
      
      const stream = await axios.get(url, { responseType: 'stream' });

      await reply({
        body: `📱 *QR Code Generated*\n\nText: "${text}"`,
        attachment: stream.data
      });

    } catch (error) {
      await reply('❌ An error occurred while generating the QR code.');
    }
  },
};

