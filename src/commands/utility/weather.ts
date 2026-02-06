import type { Command, CommandContext } from '../../types/index.js';
import axios from 'axios';

const command: Command = {
  name: 'weather',
  aliases: ['temp', 'weatherforecast'],
  description: 'Check the weather for a location',
  category: 'utility',
  usage: 'weather <city>',
  examples: ['weather Manila', 'weather Tokyo'],
  cooldown: 5000,

  async execute(context: CommandContext): Promise<void> {
    const { args, reply } = context;

    if (!args.length) {
      await reply('❌ Please provide a city name.\nUsage: weather <city>');
      return;
    }

    const city = args.join(' ');

    try {
      // wttr.in returns a nice text format with ?0 (for current weather only) or ?T (no terminal codes)
      // We want JSON to format it nicely ourselves
      const res = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
      
      const current = res.data.current_condition[0];
      const location = res.data.nearest_area[0];
      
      const tempC = current.temp_C;
      const feelsLikeC = current.FeelsLikeC;
      const humidity = current.humidity;
      const windSpeed = current.windspeedKmph;
      const desc = current.weatherDesc[0].value;
      const cityParams = location.areaName[0].value;
      const country = location.country[0].value;

      await reply(`╭─────────────────╮
│ 🌤️ WEATHER REPORT
╰─────────────────╯

🌍 Location: ${cityParams}, ${country}
☁️ Condition: ${desc}
🌡️ Temp: ${tempC}°C (Feels like ${feelsLikeC}°C)
💧 Humidity: ${humidity}%
💨 Wind: ${windSpeed} km/h

╭─────────────────╮
│ 💗 Panindigan Bot
╰─────────────────╯`);

    } catch (error) {
      console.error('Weather error:', error);
      await reply(`❌ Could not find weather for "${city}". Please check the spelling.`);
    }
  }
};

export default command;
