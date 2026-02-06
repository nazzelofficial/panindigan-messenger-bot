import { Jimp } from 'jimp';
import axios from 'axios';
import { Readable } from 'node:stream';
import type { Command, CommandContext } from '../../types/index.js';

export const command: Command = {
  name: 'invert',
  aliases: ['invertcolors', 'negative'],
  description: 'Invert image colors',
  category: 'image',
  usage: 'invert (reply to image)',
  examples: ['invert'],
  cooldown: 5000,
  async execute({ reply, event }: CommandContext) {
    if (!event.messageReply?.attachments?.[0]) {
      return reply('❌ Please reply to an image to invert it!');
    }

    const attachment = event.messageReply.attachments[0];
    if (attachment.type !== 'photo') {
      return reply('❌ Please reply to a valid image!');
    }

    try {
      await reply('🔄 Inverting colors... Please wait.');
      
      const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
      const image = await Jimp.read(Buffer.from(response.data));

      image.invert();

      const buffer = await image.getBuffer('image/png');

      await reply({
        body: '✅ Image inverted',
        attachment: Readable.from(buffer)
      });

    } catch (error) {
      await reply('❌ An error occurred while processing the image.');
    }
  },
};

