import { Jimp } from 'jimp';
import axios from 'axios';
import { Readable } from 'node:stream';
import type { Command, CommandContext } from '../../types/index.js';

export const command: Command = {
  name: 'grayscale',
  aliases: ['gray', 'bw', 'blackwhite'],
  description: 'Convert image to grayscale',
  category: 'image',
  usage: 'grayscale (reply to image)',
  examples: ['grayscale'],
  cooldown: 5000,
  async execute({ reply, event }: CommandContext) {
    if (!event.messageReply?.attachments?.[0]) {
      return reply('❌ Please reply to an image to convert to grayscale!');
    }

    const attachment = event.messageReply.attachments[0];
    if (attachment.type !== 'photo') {
      return reply('❌ Please reply to a valid image!');
    }

    try {
      await reply('⬛⬜ Converting to grayscale... Please wait.');
      
      const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
      const image = await Jimp.read(Buffer.from(response.data));

      image.greyscale();

      const buffer = await image.getBuffer('image/png');

      await reply({
        body: '✅ Image converted to grayscale',
        attachment: Readable.from(buffer)
      });

    } catch (error) {
      await reply('❌ An error occurred while processing the image.');
    }
  },
};

