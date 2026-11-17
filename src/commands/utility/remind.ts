import type { Command } from '../../types/index.js';

const reminders: Map<string, NodeJS.Timeout> = new Map();

function parseTime(input: string): number | null {
  const match = input.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

export const command: Command = {
  name: 'remind',
  aliases: ['reminder', 'remindme', 'alarm'],
  description: 'Set a reminder for later',
  category: 'utility',
  usage: 'remind <time> <message>',
  examples: ['remind 5m Take a break', 'remind 1h Meeting time', 'remind 30s Check the food'],
  cooldown: 5,

  async execute({ api, event, args, reply }) {
    if (args.length < 2) {
      await reply(`⏰ *Reminder*\n\nUsage: remind <time> <message>\n\nTime formats:\n• Xs = seconds (e.g., 30s)\n• Xm = minutes (e.g., 5m)\n• Xh = hours (e.g., 1h)\n• Xd = days (e.g., 1d)\n\nExamples:\n• remind 5m Take a break\n• remind 1h Meeting time`);
      return;
    }

    const timeStr = args[0];
    const message = args.slice(1).join(' ');

    const ms = parseTime(timeStr);
    if (!ms) {
      await reply('❌ Invalid time format! Use: 30s, 5m, 1h, or 1d');
      return;
    }

    if (ms > 24 * 60 * 60 * 1000) {
      await reply('❌ Maximum reminder time is 24 hours.');
      return;
    }

    const senderId = ('' + event.senderId).trim();
    const threadId = ('' + event.threadId).trim();
    const reminderId = `${senderId}-${Date.now()}`;

    const timeout = setTimeout(async () => {
      try {
        await api.sendMessage(threadId, { type: 'text', body: `⏰ *Reminder!*\n\n📝 ${message}` });
      } catch (err) {
        console.error('Reminder send failed:', err);
      }
      reminders.delete(reminderId);
    }, ms);

    reminders.set(reminderId, timeout);

    const timeDisplay = timeStr.replace(/(\d+)s/i, '$1 second(s)')
      .replace(/(\d+)m/i, '$1 minute(s)')
      .replace(/(\d+)h/i, '$1 hour(s)')
      .replace(/(\d+)d/i, '$1 day(s)');

    await reply(`✅ *Reminder Set!*\n\n⏰ I'll remind you in ${timeDisplay}\n📝 Message: ${message}`);
  },
};
