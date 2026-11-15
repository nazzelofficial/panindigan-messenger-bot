import { Jimp } from 'jimp';
import { proxyFetchBuffer } from '../../lib/proxyFetch.js';
import { Readable } from 'node:stream';
import type { Command, CommandContext } from '../../types/index.js';

export const command: Command = {
  name: 'resize',
  aliases: ['scale', 'size'],
  description: 'Resize an image',
  category: 'image',
  usage: 'resize <width> <height> (reply to image)',
  examples: ['resize 500 500'],
  cooldown: 5000,
  async execute({ reply, args, event }: CommandContext) {
    if (!event.messageReply?.attachments?.[0]) {
      return reply('❌ Please reply to an image to resize it!');
    }

    const attachment = event.messageReply.attachments[0];
    if (attachment.type !== 'photo') {
      return reply('❌ Please reply to a valid image!');
    }

    const width = parseInt(args[0]);
    const height = parseInt(args[1]);

    if (!width || !height || isNaN(width) || isNaN(height)) {
      return reply('❌ Usage: resize <width> <height>');
    }

    if (width > 2000 || height > 2000) {
      return reply('❌ Max size is 2000x2000.');
    }

    try {
      await reply(`📐 Resizing to ${width}x${height}... Please wait.`);
      
      const imageBuffer = await proxyFetchBuffer(attachment.url ?? '');
      if (!imageBuffer) {
        return reply('❌ Could not download the image. Try again later or use a fresh image link.');
      }
      const image = await Jimp.read(imageBuffer);

      image.resize({ w: width, h: height });

      const buffer = await image.getBuffer('image/png');

      await reply({
        body: `✅ Image resized to ${width}x${height}`,
        attachment: Readable.from(buffer)
      });

    } catch (error) {
      await reply('❌ An error occurred while processing the image.');
    }
  },
};

