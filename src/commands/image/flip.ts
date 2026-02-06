import { Jimp } from 'jimp';
import axios from 'axios';
import { Readable } from 'node:stream';
import type { Command, CommandContext } from '../../types/index.js';

export const command: Command = {
  name: 'flipimg',
  aliases: ['flipv', 'vertical'],
  description: 'Flip image vertically',
  category: 'image',
  usage: 'flipimg (reply to image)',
  examples: ['flipimg'],
  cooldown: 5000,
  async execute({ reply, event }: CommandContext) {
    if (!event.messageReply?.attachments?.[0]) {
      return reply('❌ Please reply to an image to flip it!');
    }

    const attachment = event.messageReply.attachments[0];
    if (attachment.type !== 'photo') {
      return reply('❌ Please reply to a valid image!');
    }

    try {
      await reply('🔄 Flipping image... Please wait.');
      
      const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
      const image = await Jimp.read(Buffer.from(response.data));

      image.flip({ horizontal: false, vertical: true });

      const buffer = await image.getBuffer('image/png');

      await reply({
        body: '✅ Image flipped vertically',
        attachment: Readable.from(buffer)
      });

    } catch (error) {
      await reply('❌ An error occurred while processing the image.');
    }
  },
};

