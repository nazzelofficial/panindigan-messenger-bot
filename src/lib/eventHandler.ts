import { database } from '../database/index.js';
import { BotLogger } from './logger.js';
import config from '../../config.json' with { type: 'json' };

const defaultPrefix = config.bot.prefix;

function getPhilippineTimeString(options: Intl.DateTimeFormatOptions): string {
  return new Date().toLocaleString('en-PH', {
    ...options,
    timeZone: 'Asia/Manila'
  });
}

function getPhilippineHour(): number {
  const timeStr = new Date().toLocaleString('en-US', {
    hour: 'numeric',
    hour12: false,
    timeZone: 'Asia/Manila'
  });
  return parseInt(timeStr, 10);
}

function formatShortTime(): string {
  return getPhilippineTimeString({
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

function formatFullDate(): string {
  return getPhilippineTimeString({
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function getGreeting(): string {
  const hour = getPhilippineHour();
  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  if (hour >= 17 && hour < 21) return 'Good Evening';
  return 'Good Night';
}

function getGreetingEmoji(): string {
  const hour = getPhilippineHour();
  if (hour >= 5 && hour < 12) return '🌅';
  if (hour >= 12 && hour < 17) return '☀️';
  if (hour >= 17 && hour < 21) return '🌆';
  return '🌙';
}

function getRandomWelcomeQuote(): string {
  const quotes = [
    "New adventures await!",
    "Great things are coming!",
    "Welcome to the family!",
    "Excited to have you!",
    "Let the fun begin!",
    "Your journey starts here!",
    "Together we're stronger!",
    "Ready to make memories!"
  ];
  return quotes[Math.floor(Math.random() * quotes.length)];
}

function getRandomGoodbyeQuote(): string {
  const quotes = [
    "Until we meet again!",
    "Best wishes on your journey!",
    "You'll be missed!",
    "Safe travels, friend!",
    "Hope to see you soon!",
    "Farewell for now!",
    "Take care out there!",
    "Wishing you the best!"
  ];
  return quotes[Math.floor(Math.random() * quotes.length)];
}

export async function generateProfessionalWelcome(
  client: import('panindigan-automate').MessengerClient,
  threadId: string,
  userId: string,
  userName: string,
  addedParticipantsCount: number = 1
): Promise<string> {
  let groupName = '';
  let memberCount = 0;
  let userProfile = userName || 'New Member';
  
  try {
    const threadInfo = await client.getThread(threadId);
    if (threadInfo) {
      groupName = threadInfo.name ?? '';
      const participantCount = threadInfo.participantIds?.length ||
                               threadInfo.participants?.length ||
                               0;
      memberCount = participantCount;
    }

    try {
      const profile = await client.getUser(userId);
      if (profile && profile.name) {
        userProfile = profile.name;
      }
    } catch (e) {
      BotLogger.debug(`Could not get user info: ${e}`);
    }
  } catch (error) {
    BotLogger.debug(`Failed to get thread info: ${error}`);
  }
  
  const shortTime = formatShortTime();
  const greeting = getGreeting();
  const greetingEmoji = getGreetingEmoji();
  const quote = getRandomWelcomeQuote();
  
  const customPrefix = await database.getSetting<string>(`prefix_${threadId}`) || defaultPrefix;
  
  const displayGroupName = groupName || 'this group';
  const shortGroupName = displayGroupName.length > 20 ? displayGroupName.substring(0, 17) + '...' : displayGroupName;
  const shortUserProfile = userProfile.length > 20 ? userProfile.substring(0, 17) + '...' : userProfile;
  
  // Get actual member count from database - track total who ever joined
  let actualMemberNumber = 1;
  try {
    const storedCount = await database.getSetting<number>(`total_joined_${threadId}`);
    if (storedCount !== null && storedCount !== undefined) {
      actualMemberNumber = storedCount + 1;
    } else {
      // Initialize with current member count if first time
      actualMemberNumber = memberCount > 0 ? memberCount : 1;
    }
    // Save the new total joined count
    await database.setSetting(`total_joined_${threadId}`, actualMemberNumber);
  } catch (error) {
    BotLogger.debug(`Could not update member count: ${error}`);
    actualMemberNumber = memberCount > 0 ? memberCount : 1;
  }
  
  const memberText = actualMemberNumber;
  const totalMembers = memberCount > 0 ? memberCount : '?';

  return `━━━━━━━━━━━━━━━━━━━━
  💖 𝗪𝗘𝗟𝗖𝗢𝗠𝗘 💖
━━━━━━━━━━━━━━━━━━━━

${greeting}! ${greetingEmoji}

👤 ${shortUserProfile}
🏠 ${shortGroupName}
🎯 Member #${memberText} of ${totalMembers}
⏰ ${shortTime}

━━━━━━━━━━━━━━━━━━━━
  ${customPrefix}help | ${customPrefix}rules
━━━━━━━━━━━━━━━━━━━━

✨ ${quote}`;
}

export async function generateProfessionalLeave(
  client: import('panindigan-automate').MessengerClient,
  threadId: string,
  userId: string,
  userName?: string
): Promise<string> {
  let groupName = '';
  let memberCount = 0;
  let userProfile = userName || 'Member';
  let userLevel = 0;
  let userMessages = 0;
  let userCoins = 0;
  let userXP = 0;
  
  try {
    const threadInfo = await client.getThread(threadId);
    if (threadInfo) {
      groupName = threadInfo.name ?? '';
      const participantCount = threadInfo.participantIds?.length ||
                               threadInfo.participants?.length ||
                               0;
      memberCount = participantCount;
    }

    if (!userName || userName === 'Member') {
      try {
        const profile = await client.getUser(userId);
        if (profile && profile.name) {
          userProfile = profile.name;
        }
      } catch (e) {
        BotLogger.debug(`Could not get user info for ${userId}`);
      }
    }
    
    const userData = await database.getUser(userId);
    if (userData) {
      userLevel = userData.level || 0;
      userMessages = userData.totalMessages || 0;
      userCoins = userData.coins || 0;
      userXP = userData.xp || 0;
    }
  } catch (error) {
    BotLogger.debug(`Failed to get thread info: ${error}`);
  }
  
  const shortTime = formatShortTime();
  const quote = getRandomGoodbyeQuote();
  const displayGroupName = groupName || 'this group';
  const shortGroupName = displayGroupName.length > 20 ? displayGroupName.substring(0, 17) + '...' : displayGroupName;
  const shortUserProfile = userProfile.length > 20 ? userProfile.substring(0, 17) + '...' : userProfile;
  
  // Member count doesn't change on leave - it tracks total who joined
  // Just show current active members
  const memberText = memberCount > 0 ? `${memberCount}` : '?';

  const xpNeeded = (userLevel + 1) * 100;
  const xpProgress = Math.round((userXP / xpNeeded) * 100);

  return `━━━━━━━━━━━━━━━━━━━━
   👋 𝗚𝗢𝗢𝗗𝗕𝗬𝗘 👋
━━━━━━━━━━━━━━━━━━━━

Paalam! 💫

👤 ${shortUserProfile}
🏠 ${shortGroupName}
👥 ${memberText} members left
⏰ ${shortTime}

━━━━━━━━━━━━━━━━━━━━
  📊 𝗨𝗦𝗘𝗥 𝗦𝗧𝗔𝗧𝗦
━━━━━━━━━━━━━━━━━━━━

🏆 Level ${userLevel} ⭐
✨ ${userXP}/${xpNeeded} XP (${xpProgress}%)
💬 ${userMessages} msgs | 💰 ${userCoins} coins

━━━━━━━━━━━━━━━━━━━━

🌟 ${quote}
🌸 Salamat sa lahat! 🌸`;
}

export function getAccurateTime(): string {
  return getPhilippineTimeString({
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

export function getAccurateShortTime(): string {
  return formatShortTime();
}

export function getPhilippineDateTime(): Date {
  return new Date();
}

export const eventHandler = {
  generateProfessionalWelcome,
  generateProfessionalLeave,
  getAccurateTime,
  getAccurateShortTime,
  getPhilippineDateTime,
};