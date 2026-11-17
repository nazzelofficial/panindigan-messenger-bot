import type { Command, CommandContext } from '../../types/index.js';
import musicService from '../../services/musicService.js';

const FILTERS = {
  bass: { name: 'Bass Boost', emoji: '🔊', description: 'Enhanced bass frequencies' },
  nightcore: { name: 'Nightcore', emoji: '🌙', description: 'Faster tempo, higher pitch' },
  vaporwave: { name: 'Vaporwave', emoji: '🌴', description: 'Slower tempo, lower pitch' },
  '8d': { name: '8D Audio', emoji: '🎧', description: 'Surround sound effect' },
  karaoke: { name: 'Karaoke', emoji: '🎤', description: 'Remove vocals' },
  tremolo: { name: 'Tremolo', emoji: '〰️', description: 'Oscillating volume' },
  vibrato: { name: 'Vibrato', emoji: '🎵', description: 'Oscillating pitch' },
  none: { name: 'None', emoji: '➡️', description: 'No filter applied' }
};

export const command: Command = {
  name: 'filter',
  aliases: ['fx', 'effect', 'audiofilter'],
  description: 'Apply audio filters to playback',
  category: 'music',
  usage: 'filter [bass|nightcore|vaporwave|8d|karaoke|tremolo|vibrato|none]',
  examples: ['filter', 'filter bass', 'filter nightcore'],
  cooldown: 3000,

  async execute({ event, args, reply, prefix }: CommandContext): Promise<void> {
    const threadId = event.threadId;
    const session = musicService.getSession(threadId);

    if (args.length === 0) {
      const filterList = Object.entries(FILTERS).map(([key, info]) => {
        const active = session.filter === key || (key === 'none' && !session.filter);
        return `│ ${active ? '▶️' : '○'} ${info.emoji} ${key} - ${info.description}`;
      }).join('\n');

      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     🎚️ 𝗔𝗨𝗗𝗜𝗢 𝗙𝗜𝗟𝗧𝗘𝗥𝗦 🎚️     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌── 🎛️ 𝗖𝘂𝗿𝗿𝗲𝗻𝘁 𝗙𝗶𝗹𝘁𝗲𝗿 ──┐
│ ${session.filter ? FILTERS[session.filter as keyof typeof FILTERS]?.emoji || '🎵' : '➡️'} ${session.filter || 'None'}
└────────────────────────┘

┌── 📋 𝗔𝘃𝗮𝗶𝗹𝗮𝗯𝗹𝗲 𝗙𝗶𝗹𝘁𝗲𝗿𝘀 ──┐
${filterList}
└────────────────────────────┘

┌── 📖 𝗨𝘀𝗮𝗴𝗲 ──┐
│ ${prefix}filter <name>
└────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎧 Apply effects to your music`);
      return;
    }

    const filterName = args[0].toLowerCase();

    if (filterName === 'off' || filterName === 'none' || filterName === 'reset') {
      musicService.setFilter(threadId, null);
      
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     🎚️ 𝗙𝗜𝗟𝗧𝗘𝗥 𝗥𝗘𝗠𝗢𝗩𝗘𝗗 🎚️     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

✅ Audio filter has been removed.

┌── 🎵 𝗦𝘁𝗮𝘁𝘂𝘀 ──┐
│ 🎛️ Filter: None
│ 🔊 Playing normal audio
└────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎧 ${prefix}filter to see available filters`);
      return;
    }

    if (!(filterName in FILTERS) || filterName === 'none') {
      const validFilters = Object.keys(FILTERS).filter(f => f !== 'none').join(', ');
      
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ⚠️ 𝗜𝗡𝗩𝗔𝗟𝗜𝗗 𝗙𝗜𝗟𝗧𝗘𝗥 ⚠️     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

❌ Unknown filter: "${filterName}"

┌── 📋 𝗩𝗮𝗹𝗶𝗱 𝗙𝗶𝗹𝘁𝗲𝗿𝘀 ──┐
│ ${validFilters}
└────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 ${prefix}filter to see all options`);
      return;
    }

    const filter = FILTERS[filterName as keyof typeof FILTERS];
    musicService.setFilter(threadId, filterName);

    await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     🎚️ 𝗙𝗜𝗟𝗧𝗘𝗥 𝗔𝗣𝗣𝗟𝗜𝗘𝗗 🎚️     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

✅ Audio filter applied!

┌── 🎛️ 𝗙𝗶𝗹𝘁𝗲𝗿 ──┐
│ ${filter.emoji} ${filter.name}
│ 📝 ${filter.description}
└────────────────────┘

${session.currentTrack ? `┌── 🎵 𝗡𝗼𝘄 𝗣𝗹𝗮𝘆𝗶𝗻𝗴 ──┐
│ 🎶 ${session.currentTrack.title.substring(0, 30)}...
└────────────────────────┘` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎧 ${prefix}filter none to remove`);
  }
};
