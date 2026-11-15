import { Jimp } from 'jimp';
import { proxyFetchBuffer } from '../../lib/proxyFetch.js';
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
      
      const imageBuffer = await proxyFetchBuffer(attachment.url ?? '');
      if (!imageBuffer) {
        return reply('❌ Could not download the image. Try again later or use a fresh image link.');
      }
      const image = await Jimp.read(imageBuffer);

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

