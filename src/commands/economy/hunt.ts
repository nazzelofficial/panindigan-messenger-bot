import type { Command } from '../../types/index.js';
import { database } from '../../database/index.js';
import { safeGetUserInfo } from '../../lib/apiHelpers.js';

const animals = [
  { name: 'Rabbit', emoji: '🐰', value: 15, rarity: 'Common' },
  { name: 'Squirrel', emoji: '🐿️', value: 12, rarity: 'Common' },
  { name: 'Duck', emoji: '🦆', value: 18, rarity: 'Common' },
  { name: 'Fox', emoji: '🦊', value: 35, rarity: 'Uncommon' },
  { name: 'Deer', emoji: '🦌', value: 50, rarity: 'Uncommon' },
  { name: 'Wild Boar', emoji: '🐗', value: 60, rarity: 'Uncommon' },
  { name: 'Wolf', emoji: '🐺', value: 80, rarity: 'Rare' },
  { name: 'Bear', emoji: '🐻', value: 120, rarity: 'Rare' },
  { name: 'Lion', emoji: '🦁', value: 200, rarity: 'Epic' },
  { name: 'Tiger', emoji: '🐯', value: 250, rarity: 'Epic' },
  { name: 'Dragon', emoji: '🐉', value: 500, rarity: 'Legendary' },
  { name: 'Phoenix', emoji: '🔥', value: 800, rarity: 'Mythic' },
];

const fails = [
  { message: "The animal escaped into the bushes!", emoji: "🌿" },
  { message: "Your weapon jammed!", emoji: "🔧" },
  { message: "You tripped over a root!", emoji: "🌳" },
  { message: "A loud noise scared everything away!", emoji: "💥" },
  { message: "You forgot your hunting gear!", emoji: "🎒" },
  { message: "The forest was too quiet today...", emoji: "🌲" },
];

function getRandomAnimal(): { name: string; emoji: string; value: number; rarity: string } | null {
  const roll = Math.random();
  
  if (roll < 0.20) return null;
  
  let rarityRoll = Math.random();
  let selected = animals.filter(a => {
    if (rarityRoll < 0.01) return a.rarity === 'Mythic';
    if (rarityRoll < 0.05) return a.rarity === 'Legendary';
    if (rarityRoll < 0.12) return a.rarity === 'Epic';
    if (rarityRoll < 0.30) return a.rarity === 'Rare';
    if (rarityRoll < 0.55) return a.rarity === 'Uncommon';
    return a.rarity === 'Common';
  });
  
  if (selected.length === 0) {
    selected = animals.filter(a => a.rarity === 'Common');
  }
  
  return selected[Math.floor(Math.random() * selected.length)];
}

function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'Mythic': return '🌈';
    case 'Legendary': return '🌟';
    case 'Epic': return '💜';
    case 'Rare': return '💙';
    case 'Uncommon': return '💚';
    default: return '⚪';
  }
}

export const command: Command = {
  name: 'hunt',
  aliases: ['hunting', 'safari'],
  description: 'Go hunting to catch animals and earn coins',
  category: 'economy',
  usage: 'hunt',
  examples: ['hunt'],
  cooldown: 60000,

  async execute({ api, event, reply, prefix }) {
    const senderId = ('' + event.senderId).trim();

    try {
      const userInfo = await safeGetUserInfo(api, senderId);
      const userName = userInfo[senderId]?.name || 'Hunter';
      await database.getOrCreateUser(senderId, userName);

      const caught = getRandomAnimal();
      
      if (!caught) {
        const fail = fails[Math.floor(Math.random() * fails.length)];
        
        await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     🏹 𝗛𝗨𝗡𝗧𝗜𝗡𝗚 🏹     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌── ${fail.emoji} 𝗙𝗮𝗶𝗹𝗲𝗱 𝗛𝘂𝗻𝘁 ──┐
│ ${fail.message}
└─────────────────────────────┘

😅 Better luck next time!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️ Hunt again in 1 minute`);
        return;
      }

      const result = await database.addCoins(senderId, caught.value, 'game_win', `Hunted ${caught.name}`);
      const rarityIcon = getRarityColor(caught.rarity);

      const celebrationMsg = 
        caught.rarity === 'Mythic' ? '🎊 MYTHIC HUNT! INCREDIBLE!' :
        caught.rarity === 'Legendary' ? '🎉 LEGENDARY CATCH!' :
        caught.rarity === 'Epic' ? '✨ Epic hunt!' :
        '🏹 Successful hunt!';

      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     🏹 𝗛𝗨𝗡𝗧𝗜𝗡𝗚 🏹     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌── 🎯 𝗖𝗮𝘂𝗴𝗵𝘁! ──┐
│ ${caught.emoji} ${caught.name}
│ ${rarityIcon} Rarity: ${caught.rarity}
│ 💰 Value: +${caught.value} coins
└─────────────────────────────┘

┌── 🏦 𝗕𝗮𝗹𝗮𝗻𝗰𝗲 ──┐
│ 🪙 ${result.newBalance.toLocaleString()} coins
└────────────────────┘

${celebrationMsg}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️ Hunt again in 1 minute`);

    } catch (error) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ❌ 𝗘𝗥𝗥𝗢𝗥 ❌     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

⚠️ Hunting failed. Please try again.`);
    }
  },
};
