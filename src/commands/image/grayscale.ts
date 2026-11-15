import { Jimp } from 'jimp';
import { proxyFetchBuffer } from '../../lib/proxyFetch.js';
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
      
      const imageBuffer = await proxyFetchBuffer(attachment.url ?? '');
      if (!imageBuffer) {
        return reply('❌ Could not download the image. Try again later or use a fresh image link.');
      }
      const image = await Jimp.read(imageBuffer);

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

