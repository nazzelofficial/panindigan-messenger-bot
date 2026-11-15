import { Jimp } from 'jimp';
import { proxyFetchBuffer } from '../../lib/proxyFetch.js';
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
      
      const imageBuffer = await proxyFetchBuffer(attachment.url ?? '');
      if (!imageBuffer) {
        return reply('❌ Could not download the image. Try again later or use a fresh image link.');
      }
      const image = await Jimp.read(imageBuffer);

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

