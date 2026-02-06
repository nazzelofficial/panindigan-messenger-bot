import { Jimp } from 'jimp';
import axios from 'axios';
import { Readable } from 'node:stream';
import type { Command, CommandContext } from '../../types/index.js';

export const command: Command = {
  name: 'sepia',
  aliases: ['vintage', 'old'],
  description: 'Apply sepia filter to image',
  category: 'image',
  usage: 'sepia (reply to image)',
  examples: ['sepia'],
  cooldown: 5000,
  async execute({ reply, event }: CommandContext) {
    if (!event.messageReply?.attachments?.[0]) {
      return reply('❌ Please reply to an image to apply sepia filter!');
    }

    const attachment = event.messageReply.attachments[0];
    if (attachment.type !== 'photo') {
      return reply('❌ Please reply to a valid image!');
    }

    try {
      await reply('🟤 Applying sepia filter... Please wait.');
      
      const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
      const image = await Jimp.read(Buffer.from(response.data));

      image.sepia();

      const buffer = await image.getBuffer('image/png');

      await reply({
        body: '✅ Sepia filter applied',
        attachment: Readable.from(buffer)
      });

    } catch (error) {
      await reply('❌ An error occurred while processing the image.');
    }
  },
};

