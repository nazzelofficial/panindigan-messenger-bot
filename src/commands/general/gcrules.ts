import type { Command, CommandContext } from '../../types/index.js';

const command: Command = {
  name: 'gcrules',
  aliases: ['rulespanindigan', 'panindiganrules', 'gcr'],
  description: 'Show the Official Panindigan GC Rules',
  category: 'general',
  usage: 'gcrules',
  examples: ['gcrules'],
  cooldown: 10000,

  async execute(context: CommandContext): Promise<void> {
    const { reply } = context;

    const rules = `� Official Panindigan GC Rules

📝 Nickname (Required)
Age | Location
Example: 21 | Nueva Ecija

⛔ BAWAL

• 18+/NSFW content (videos, photos, links, etc.)
• Spam, flood, auto-messages, paulit-ulit na links
• Bastos, mura, away, bullying, pananakot, at anumang disrespect
• Dummy/Fake Facebook account (Real account only)
• Baguhin ang GC Theme, Emoji, Photo, Chat Name, o Nicknames ng iba
• Unauthorized promotion/advertisement

✅ PWEDE

• Chill na kwentuhan at bonding
• Respeto sa lahat
• Maghanap ng BF/GF/Best Friend/Tropa
• Maghanap ng makakalaro (May hiwalay na Panindigan Games Zone GC)

⚠️ PAALALA

• Tagalog o English lamang para makasabay ang lahat
• 18–25 years old only (No minors)
• I-report agad sa Admin/Moderator ang anumang problema

🤖 SECURITY

May sariling Panindigan Bot ang GC na nagbabantay at maaaring mag-warning, mute, kick, o ban sa mga lumalabag.

🌐 Official Website: https://www.panindigan.com

📘 Facebook Group: https://www.facebook.com/groups/panindigan

Respect Everyone • No Drama • Enjoy & Have Fun! ❤️`;

    await reply(rules);
  }
};

export default command;
