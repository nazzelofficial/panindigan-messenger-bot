import { Jimp } from 'jimp';
import axios from 'axios';
import { Readable } from 'node:stream';
import type { Command, CommandContext } from '../../types/index.js';

export const command: Command = {
  name: 'mirror',
  aliases: ['fliph', 'horizontal'],
  description: 'Mirror an image horizontally',
  category: 'image',
  usage: 'mirror (reply to image)',
  examples: ['mirror'],
  cooldown: 5000,
  async execute({ reply, event }: CommandContext) {
    if (!event.messageReply?.attachments?.[0]) {
      return reply('❌ Please reply to an image to mirror it!');
    }

    const attachment = event.messageReply.attachments[0];
    if (attachment.type !== 'photo') {
      return reply('❌ Please reply to a valid image!');
    }

    try {
      await reply('🪞 Mirroring image... Please wait.');
      
      const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
      const image = await Jimp.read(Buffer.from(response.data));

      image.flip({ horizontal: true, vertical: false });

      const buffer = await image.getBuffer('image/png');

      await reply({
        body: '✅ Image mirrored horizontally',
        attachment: Readable.from(buffer)
      });

    } catch (error) {
      await reply('❌ An error occurred while processing the image.');
    }
  },
};

