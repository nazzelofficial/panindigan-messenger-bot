import { Jimp } from 'jimp';
import axios from 'axios';
import { Readable } from 'node:stream';
import type { Command, CommandContext } from '../../types/index.js';

export const command: Command = {
  name: 'blur',
  aliases: ['blurimage'],
  description: 'Blur an image',
  category: 'image',
  usage: 'blur (reply to image) [level]',
  examples: ['blur', 'blur 10'],
  cooldown: 5000,
  async execute({ reply, event, args }: CommandContext) {
    if (!event.messageReply?.attachments?.[0]) {
      return reply('❌ Please reply to an image to blur it!');
    }

    const attachment = event.messageReply.attachments[0];
    if (attachment.type !== 'photo') {
      return reply('❌ Please reply to a valid image!');
    }

    const url = attachment.url;
    const blurLevel = args[0] ? parseInt(args[0]) : 5;

    if (isNaN(blurLevel) || blurLevel < 1 || blurLevel > 100) {
      return reply('❌ Blur level must be a number between 1 and 100.');
    }

    try {
      await reply('🖌️ Blurring image... Please wait.');
      
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const image = await Jimp.read(Buffer.from(response.data));

      image.blur(blurLevel);

      const buffer = await image.getBuffer('image/png');

      await reply({
        body: `✅ Image blurred (Level: ${blurLevel})`,
        attachment: Readable.from(buffer)
      });

    } catch (error) {
      await reply('❌ An error occurred while processing the image.');
    }
  },
};

