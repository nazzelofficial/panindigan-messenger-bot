import type { Command } from '../../types/index.js';
import { database } from '../../database/index.js';
import { safeGetUserInfo } from '../../lib/apiHelpers.js';

const catches = [
  { name: 'Goldfish', emoji: '🐠', value: 5, rarity: 'Common' },
  { name: 'Sardine', emoji: '🐟', value: 8, rarity: 'Common' },
  { name: 'Mackerel', emoji: '🐟', value: 12, rarity: 'Common' },
  { name: 'Trout', emoji: '🐟', value: 20, rarity: 'Uncommon' },
  { name: 'Salmon', emoji: '🐟', value: 35, rarity: 'Uncommon' },
  { name: 'Tuna', emoji: '🐟', value: 50, rarity: 'Uncommon' },
  { name: 'Swordfish', emoji: '🗡️', value: 75, rarity: 'Rare' },
  { name: 'Shark', emoji: '🦈', value: 100, rarity: 'Rare' },
  { name: 'Dolphin', emoji: '🐬', value: 150, rarity: 'Epic' },
  { name: 'Whale', emoji: '🐋', value: 250, rarity: 'Epic' },
  { name: 'Golden Fish', emoji: '✨', value: 500, rarity: 'Legendary' },
  { name: 'Mermaid Treasure', emoji: '🧜‍♀️', value: 1000, rarity: 'Mythic' },
];

const junk = [
  { name: 'Old Boot', emoji: '👢', value: 1 },
  { name: 'Seaweed', emoji: '🌿', value: 2 },
  { name: 'Empty Bottle', emoji: '🍾', value: 1 },
  { name: 'Rusty Can', emoji: '🥫', value: 1 },
  { name: 'Broken Net', emoji: '🕸️', value: 0 },
];

function getRandomCatch(): { name: string; emoji: string; value: number; rarity?: string; isJunk: boolean } {
  const roll = Math.random();
  
  if (roll < 0.15) {
    const item = junk[Math.floor(Math.random() * junk.length)];
    return { ...item, isJunk: true };
  }
  
  let rarityRoll = Math.random();
  let selectedCatches = catches.filter(c => {
    if (rarityRoll < 0.01) return c.rarity === 'Mythic';
    if (rarityRoll < 0.05) return c.rarity === 'Legendary';
    if (rarityRoll < 0.15) return c.rarity === 'Epic';
    if (rarityRoll < 0.35) return c.rarity === 'Rare';
    if (rarityRoll < 0.60) return c.rarity === 'Uncommon';
    return c.rarity === 'Common';
  });
  
  if (selectedCatches.length === 0) {
    selectedCatches = catches.filter(c => c.rarity === 'Common');
  }
  
  const item = selectedCatches[Math.floor(Math.random() * selectedCatches.length)];
  return { ...item, isJunk: false };
}

function getRarityColor(rarity?: string): string {
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
  name: 'fish',
  aliases: ['fishing', 'cast'],
  description: 'Go fishing to catch fish and earn coins',
  category: 'economy',
  usage: 'fish',
  examples: ['fish'],
  cooldown: 45000,

  async execute({ api, event, reply, prefix }) {
    const senderId = ('' + event.senderId).trim();

    try {
      const userInfo = await safeGetUserInfo(api, senderId);
      const userName = userInfo[senderId]?.name || 'Fisher';
      await database.getOrCreateUser(senderId, userName);

      const caught = getRandomCatch();
      
      if (caught.isJunk || caught.value === 0) {
        await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     🎣 𝗙𝗜𝗦𝗛𝗜𝗡𝗚 🎣     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌── 🗑️ 𝗝𝘂𝗻𝗸 𝗖𝗮𝘂𝗴𝗵𝘁 ──┐
│ ${caught.emoji} ${caught.name}
│ 💰 Value: ${caught.value} coins
└─────────────────────────────┘

😅 Better luck next time!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️ Fish again in 45 seconds`);
        return;
      }

      const result = await database.addCoins(senderId, caught.value, 'game_win', `Caught ${caught.name}`);
      const rarityIcon = getRarityColor(caught.rarity);

      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     🎣 𝗙𝗜𝗦𝗛𝗜𝗡𝗚 🎣     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┌── 🐟 𝗖𝗮𝘁𝗰𝗵! ──┐
│ ${caught.emoji} ${caught.name}
│ ${rarityIcon} Rarity: ${caught.rarity}
│ 💰 Value: +${caught.value} coins
└─────────────────────────────┘

┌── 🏦 𝗕𝗮𝗹𝗮𝗻𝗰𝗲 ──┐
│ 🪙 ${result.newBalance.toLocaleString()} coins
└────────────────────┘

${caught.rarity === 'Legendary' || caught.rarity === 'Mythic' ? '🎉 AMAZING CATCH!' : '🎣 Nice catch!'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️ Fish again in 45 seconds`);

    } catch (error) {
      await reply(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃     ❌ 𝗘𝗥𝗥𝗢𝗥 ❌     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

⚠️ Fishing failed. Please try again.`);
    }
  },
};
