import { Jimp } from 'jimp';
import { proxyFetchBuffer } from '../../lib/proxyFetch.js';
import { Readable } from 'node:stream';
import type { Command, CommandContext } from '../../types/index.js';

export const command: Command = {
  name: 'pixelate',
  aliases: ['pixel', '8bit'],
  description: 'Pixelate an image',
  category: 'image',
  usage: 'pixelate (reply to image) [level]',
  examples: ['pixelate', 'pixelate 20'],
  cooldown: 5000,
  async execute({ reply, event, args }: CommandContext) {
    if (!event.messageReply?.attachments?.[0]) {
      return reply('❌ Please reply to an image to pixelate it!');
    }

    const attachment = event.messageReply.attachments[0];
    if (attachment.type !== 'photo') {
      return reply('❌ Please reply to a valid image!');
    }

    const level = args[0] ? parseInt(args[0]) : 10;
    if (isNaN(level) || level < 1 || level > 100) {
      return reply('❌ Pixelate level must be a number between 1 and 100.');
    }

    try {
      await reply(`🟩 Pixelating image (Level: ${level})... Please wait.`);
      
      const imageBuffer = await proxyFetchBuffer(attachment.url ?? '');
      if (!imageBuffer) {
        return reply('❌ Could not download the image. Try again later or use a fresh image link.');
      }
      const image = await Jimp.read(imageBuffer);

      image.pixelate(level);

      const buffer = await image.getBuffer('image/png');

      await reply({
        body: `✅ Image pixelated`,
        attachment: Readable.from(buffer)
      });

    } catch (error) {
      await reply('❌ An error occurred while processing the image.');
    }
  },
};

