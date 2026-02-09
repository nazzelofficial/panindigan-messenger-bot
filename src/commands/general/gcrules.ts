import type { Command, CommandContext } from '../../types/index.js';

const command: Command = {
  name: 'gcrules',
  aliases: ['rulespanindigan', 'panindiganrules', 'gcr'],
  description: 'Show the Panindigan Official Messenger GC Rules (Condensed)',
  category: 'general',
  usage: 'gcrules',
  examples: ['gcrules'],
  cooldown: 10000,

  async execute(context: CommandContext): Promise<void> {
    const { reply } = context;

    const rules = `🔥 PANINDIGAN GC RULES 🔥

⛔ MAHIGPIT NA BAWAL:
• Games/Gaming topics (sa FB Group/Gamers Hub lang ito)
• Spam, Flood, Auto-messages, Paulit-ulit na links
• Toxic, Drama, Paninira, Pa-issue
• Bastos, Mura, Pananakot, Disrespect
• NSFW/18+ content (Auto-kick/ban)
• Dummy accounts (Real FB only)

✅ OK DITO:
• Chill na kwentuhan at bonding
• Respeto sa lahat (bata o matanda)
• Natural na usapan, walang plastikan

⚠️ PAALALA:
• Bawal mag-screenshot/share ng convo sa labas
• Respeto sa privacy (iwas kulit sa DM)
• Admin decision is final

🤖 May bot na nagbabantay. Auto-kick sa pasaway.

🔥 Panindigan ang Respeto at Good Vibes!`;

    await reply(rules);
  }
};

export default command;
