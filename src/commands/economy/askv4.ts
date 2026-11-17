import type { Command } from '../../types/index.js';
import { database } from '../../database/index.js';
import OpenAI from 'openai';

let openai: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

export const command: Command = {
  name: 'askv4',
  aliases: ['askcreative', 'creative', 'story', 'write'],
  description: 'Creative writing and stories (costs 25 coins)',
  category: 'economy',
  usage: 'askv4 <prompt>',
  examples: ['askv4 Write a short poem about the moon'],
  cooldown: 20000,

  async execute({ api, event, args, reply, prefix }) {
    const userId = ('' + event.senderId).trim();
    const prompt = args.join(' ').trim();

    if (!prompt) {
      await reply(`╭───────────────────╮
│  ✨ AI v4 CREATE │
╰───────────────────╯
📌 ${prefix}askv4 <prompt>
💰 Cost: 25 coins
🎨 Stories & poems`);
      return;
    }

    const client = getOpenAI();
    if (!client) {
      await reply(`❌ AI service not configured`);
      return;
    }

    const cost = 25;
    const currentCoins = await database.getUserCoins(userId);
    
    if (currentCoins < cost) {
      await reply(`╭───────────────────╮
│   💸 NO COINS    │
╰───────────────────╯
💰 Have: ${currentCoins.toLocaleString()}
💵 Need: ${cost}
📌 ${prefix}claim for coins`);
      return;
    }

    try {
      await reply(`✨ Creating...`);

      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { 
            role: "system", 
            content: "You are a creative writer. Generate engaging, imaginative content. Keep responses under 1500 characters for chat. Be creative, poetic, and expressive."
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 800,
      });

      const answer = response.choices[0]?.message?.content || "I couldn't generate a response.";
      
      await database.removeCoins(userId, cost, 'ai_usage', 'AI askv4 command');
      const newBalance = await database.getUserCoins(userId);

      const truncatedAnswer = answer.length > 1600 ? answer.substring(0, 1600) + '...' : answer;

      await reply(`╭───────────────────╮
│  ✨ AI v4 CREATE │
╰───────────────────╯
${truncatedAnswer}

💰 -${cost} │ Bal: ${newBalance.toLocaleString()}`);
    } catch (error: any) {
      await reply(`❌ ${error.message || 'AI Error'}`);
    }
  },
};
