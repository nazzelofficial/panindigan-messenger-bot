import type { Command, CommandContext } from '../../types/index.js';
import { badWordsFilter } from '../../lib/badwords.js';

const command: Command = {
  name: 'moderation',
  aliases: ['mod', 'automod', 'filter'],
  description: 'Configure auto-moderation settings for the group',
  category: 'admin',
  usage: 'moderation <option> [value]',
  examples: [
    'moderation',
    'moderation badwords on',
    'moderation spam off',
    'moderation addword badword',
  ],
  adminOnly: true,

  async execute(context: CommandContext): Promise<void> {
    const { args, reply, event, prefix } = context;
    const threadId = event.threadId;
    const settings = await badWordsFilter.getSettings(threadId);

    if (args.length === 0 || args[0]?.toLowerCase() === 'status') {
      const badwordsStatus = settings.badWordsEnabled ? '🟢 ON' : '🔴 OFF';
      const spamStatus = settings.spamEnabled ? '🟢 ON' : '🔴 OFF';
      const linksStatus = settings.linksEnabled ? '🟢 ON' : '🔴 OFF';
      const phoneStatus = settings.phoneEnabled ? '🟢 ON' : '🔴 OFF';
      const capsStatus = settings.capsEnabled ? '🟢 ON' : '🔴 OFF';
      
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃   🛡️ 𝗔𝗨𝗧𝗢-𝗠𝗢𝗗𝗘𝗥𝗔𝗧𝗜𝗢𝗡 🛡️   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌── 📊 𝗦𝘁𝗮𝘁𝘂𝘀 ──┐
│ 🚫 Bad Words: ${badwordsStatus}
│ 📨 Spam: ${spamStatus}
│ 🔗 Links: ${linksStatus}
│ 📱 Phone: ${phoneStatus}
│ 🔠 Caps Lock: ${capsStatus}
│ ⚡ Action: ${settings.action.toUpperCase()}
│ 📝 Custom Words: ${settings.customBadWords.length}
└─────────────────────────────┘

┌── 🔧 𝗖𝗼𝗺𝗺𝗮𝗻𝗱𝘀 ──┐
│ ${prefix}mod badwords <on/off>
│ ${prefix}mod spam <on/off>
│ ${prefix}mod links <on/off>
│ ${prefix}mod phone <on/off>
│ ${prefix}mod caps <on/off>
│ ${prefix}mod action <warn/delete>
│ ${prefix}mod addword <word>
│ ${prefix}mod removeword <word>
│ ${prefix}mod listwords
└─────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Example: ${prefix}mod badwords on`);
      return;
    }

    const option = args[0].toLowerCase();
    const value = args[1]?.toLowerCase();

    switch (option) {
      case 'badwords':
      case 'badword': {
        if (value === 'on' || value === 'true') {
          await badWordsFilter.updateSettings({ badWordsEnabled: true }, threadId);
          await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ✅ 𝗨𝗣𝗗𝗔𝗧𝗘𝗗 ✅     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🚫 Bad words filter: 🟢 ENABLED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Messages with bad words will be moderated`);
        } else if (value === 'off' || value === 'false') {
          await badWordsFilter.updateSettings({ badWordsEnabled: false }, threadId);
          await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ✅ 𝗨𝗣𝗗𝗔𝗧𝗘𝗗 ✅     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🚫 Bad words filter: 🔴 DISABLED`);
        } else {
          await reply(`⚠️ Usage: ${prefix}mod badwords <on/off>`);
        }
        break;
      }

      case 'spam': {
        if (value === 'on' || value === 'true') {
          await badWordsFilter.updateSettings({ spamEnabled: true }, threadId);
          await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ✅ 𝗨𝗣𝗗𝗔𝗧𝗘𝗗 ✅     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

📨 Spam detection: 🟢 ENABLED`);
        } else if (value === 'off' || value === 'false') {
          await badWordsFilter.updateSettings({ spamEnabled: false }, threadId);
          await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ✅ 𝗨𝗣𝗗𝗔𝗧𝗘𝗗 ✅     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

📨 Spam detection: 🔴 DISABLED`);
        } else {
          await reply(`⚠️ Usage: ${prefix}mod spam <on/off>`);
        }
        break;
      }

      case 'links':
      case 'link': {
        if (value === 'on' || value === 'true') {
          await badWordsFilter.updateSettings({ linksEnabled: true }, threadId);
          await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ✅ 𝗨𝗣𝗗𝗔𝗧𝗘𝗗 ✅     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🔗 Link blocking: 🟢 ENABLED`);
        } else if (value === 'off' || value === 'false') {
          await badWordsFilter.updateSettings({ linksEnabled: false }, threadId);
          await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ✅ 𝗨𝗣𝗗𝗔𝗧𝗘𝗗 ✅     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🔗 Link blocking: 🔴 DISABLED`);
        } else {
          await reply(`⚠️ Usage: ${prefix}mod links <on/off>`);
        }
        break;
      }

      case 'phone': {
        if (value === 'on' || value === 'true') {
          await badWordsFilter.updateSettings({ phoneEnabled: true }, threadId);
          await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ✅ 𝗨𝗣𝗗𝗔𝗧𝗘𝗗 ✅     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

📱 Phone blocking: 🟢 ENABLED`);
        } else if (value === 'off' || value === 'false') {
          await badWordsFilter.updateSettings({ phoneEnabled: false }, threadId);
          await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ✅ 𝗨𝗣𝗗𝗔𝗧𝗘𝗗 ✅     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

📱 Phone blocking: 🔴 DISABLED`);
        } else {
          await reply(`⚠️ Usage: ${prefix}mod phone <on/off>`);
        }
        break;
      }

      case 'caps': {
        if (value === 'on' || value === 'true') {
          await badWordsFilter.updateSettings({ capsEnabled: true }, threadId);
          await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ✅ 𝗨𝗣𝗗𝗔𝗧𝗘𝗗 ✅     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🔠 Caps lock detection: 🟢 ENABLED`);
        } else if (value === 'off' || value === 'false') {
          await badWordsFilter.updateSettings({ capsEnabled: false }, threadId);
          await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ✅ 𝗨𝗣𝗗𝗔𝗧𝗘𝗗 ✅     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🔠 Caps lock detection: 🔴 DISABLED`);
        } else {
          await reply(`⚠️ Usage: ${prefix}mod caps <on/off>`);
        }
        break;
      }

      case 'action': {
        if (value === 'warn' || value === 'delete' || value === 'mute' || value === 'kick') {
          await badWordsFilter.updateSettings({ action: value as any }, threadId);
          await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ✅ 𝗨𝗣𝗗𝗔𝗧𝗘𝗗 ✅     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

⚡ Moderation action: ${value.toUpperCase()}`);
        } else {
          await reply(`⚠️ Usage: ${prefix}mod action <warn/delete/mute/kick>`);
        }
        break;
      }

      case 'addword': {
        const word = args.slice(1).join(' ');
        if (!word) {
          await reply(`⚠️ Please specify a word to add.\nUsage: ${prefix}mod addword <word>`);
          return;
        }
        await badWordsFilter.addCustomBadWord(word, threadId);
        await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ✅ 𝗪𝗢𝗥𝗗 𝗔𝗗𝗗𝗘𝗗 ✅     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

📝 Added "${word}" to the bad words list.`);
        break;
      }

      case 'removeword': {
        const word = args.slice(1).join(' ');
        if (!word) {
          await reply(`⚠️ Please specify a word to remove.\nUsage: ${prefix}mod removeword <word>`);
          return;
        }
        await badWordsFilter.removeCustomBadWord(word, threadId);
        await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ✅ 𝗪𝗢𝗥𝗗 𝗥𝗘𝗠𝗢𝗩𝗘𝗗 ✅     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

📝 Removed "${word}" from the bad words list.`);
        break;
      }

      case 'listwords': {
        if (settings.customBadWords.length === 0) {
          await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     📝 𝗕𝗔𝗗 𝗪𝗢𝗥𝗗𝗦 📝     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

ℹ️ No custom bad words have been added.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Add words: ${prefix}mod addword <word>`);
        } else {
          const wordList = settings.customBadWords.map((w, i) => `│ ${i + 1}. ${w}`).join('\n');
          await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     📝 𝗕𝗔𝗗 𝗪𝗢𝗥𝗗𝗦 📝     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌── 📋 𝗖𝘂𝘀𝘁𝗼𝗺 𝗟𝗶𝘀𝘁 ──┐
${wordList}
└─────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Total: ${settings.customBadWords.length} words`);
        }
        break;
      }

      default:
        await reply(`⚠️ Unknown option: ${option}

💡 Use ${prefix}mod for help.`);
    }
  },
};

export default command;
