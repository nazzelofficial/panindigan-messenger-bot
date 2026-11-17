import type { Command, CommandContext } from '../../types/index.js';
import { BotLogger } from '../../lib/logger.js';
import { decorations } from '../../lib/messageFormatter.js';

// panindigan-automate applies thread themes via the official Messenger color
// mutation, which only accepts the official color palette (hex values).
// Facebook "theme IDs" are not supported.
const THEMES: { [key: string]: string } = {
  'default': '0000ff',
  'hot_pink': 'ff5ca1',
  'aqua': '30d5c8',
  'bright_purple': 'a442f4',
  'orange': 'fa810d',
  'green': '54d267',
  'lavender': 'bdaef4',
  'red': 'f44236',
  'yellow': 'f2ba0c',
  'teal_blue': '00c6ff',
  'berry': 'e85ab4',
  'candy': 'ffafbe',
  'citrus': 'ffa900',
  'earth': 'c97941',
  'support': 'ff8f80',
  'music': '8a2be2',
  'pride': '9b59b6',
  'doctor_strange': '614051',
  'sky': '5ec1ff',
  'tie_dye': '8c9fd6',
  'peach': 'ffb379',
  'mango': 'ffc300',
  'honey': 'ffb673',
  'chill': '00c8c8',
  'gym': 'd51b21',
  'lol': 'ff9933',
  'rose': 'f5b9d4',
  'wood': '6f4e37',
  'lavender_purple': 'bdaef4',
  'ocean': '0072d6',
  'space': '000000',
  'cherry': 'e0115f',
  'vibe': '1987ff',
  'maple': 'ff5722',
  'apple': '4bd677',
  'care': 'ff5c8d'
};

const command: Command = {
  name: 'settheme',
  aliases: ['theme', 'color', 'setcolor'],
  description: 'Change the group chat theme/color',
  category: 'admin',
  usage: 'settheme <theme name>',
  examples: ['settheme hot_pink', 'settheme aqua', 'settheme list'],
  adminOnly: true,
  cooldown: 15000,

  async execute(context: CommandContext): Promise<void> {
    const { api, event, args, reply, prefix } = context;
    
    if (args.length === 0 || args[0].toLowerCase() === 'list') {
      const themeList = Object.keys(THEMES).map(t => `• ${t}`).join('\n');
      
      await reply(`🎨 『 SET THEME 』 🎨
═══════════════════════════
${decorations.fire} Change group theme
═══════════════════════════

◈ USAGE
═══════════════════════════
➤ ${prefix}settheme <theme>

◈ AVAILABLE THEMES
═══════════════════════════
${themeList}

◈ EXAMPLE
═══════════════════════════
➤ ${prefix}settheme hot_pink`);
      return;
    }
    
    const themeName = args[0].toLowerCase();
    const themeId = THEMES[themeName];
    
    if (!themeId) {
      await reply(`${decorations.fire} 『 ERROR 』
═══════════════════════════
❌ Unknown theme: ${themeName}
💡 Use ${prefix}settheme list`);
      return;
    }
    
    try {
      await api.changeGroupTheme(String(event.threadId), themeId);
      
      const timestamp = new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Manila',
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      
      BotLogger.info(`Changed theme to ${themeName} for group ${event.threadId}`);
      
      await reply(`🎨 『 THEME CHANGED 』 🎨
═══════════════════════════
${decorations.fire} Theme Updated
═══════════════════════════

◈ NEW THEME
═══════════════════════════
🎨 Theme: ${themeName}
⏰ Time: ${timestamp}

═══════════════════════════
${decorations.sparkle} Theme applied successfully!`);
    } catch (err) {
      BotLogger.error(`Failed to change theme for group ${event.threadId}`, err);
      await reply(`${decorations.fire} 『 ERROR 』
═══════════════════════════
❌ Failed to change theme

◈ POSSIBLE REASONS
═══════════════════════════
• Bot lacks admin permissions
• Invalid theme ID`);
    }
  }
};

export default command;
