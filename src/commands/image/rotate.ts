import { Jimp } from 'jimp';
import axios from 'axios';
import { Readable } from 'node:stream';
import type { Command, CommandContext } from '../../types/index.js';

export const command: Command = {
  name: 'rotate',
  aliases: ['turn', 'spin'],
  description: 'Rotate an image',
  category: 'image',
  usage: 'rotate <90/180/270> (reply to image)',
  examples: ['rotate 90'],
  cooldown: 5000,
  async execute({ reply, args, event }: CommandContext) {
    if (!event.messageReply?.attachments?.[0]) {
      return reply('❌ Please reply to an image to rotate it!');
    }

    const attachment = event.messageReply.attachments[0];
    if (attachment.type !== 'photo') {
      return reply('❌ Please reply to a valid image!');
    }

    const degrees = parseInt(args[0]) || 90;
    if (degrees % 90 !== 0) {
      return reply('❌ Please provide a multiple of 90 degrees (90, 180, 270).');
    }

    try {
      await reply(`🔄 Rotating image ${degrees}°... Please wait.`);
      
      const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
      const image = await Jimp.read(Buffer.from(response.data));

      image.rotate(degrees);

      const buffer = await image.getBuffer('image/png');

      await reply({
        body: `✅ Image rotated ${degrees}°`,
        attachment: Readable.from(buffer)
      });

    } catch (error) {
      await reply('❌ An error occurred while processing the image.');
    }
  },
};

