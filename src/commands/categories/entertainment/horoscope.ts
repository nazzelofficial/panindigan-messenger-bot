import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { sha256 } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

interface Sign {
  readonly name: string;
  readonly dates: string;
  readonly element: string;
  readonly forecasts: readonly string[];
}

const SIGNS: readonly Sign[] = [
  {
    name: "aries",
    dates: "Mar 21 – Apr 19",
    element: "Fire",
    forecasts: [
      "A bold move today pays off more than waiting for perfect conditions.",
      "Your patience is being tested, but the reward is just around the corner.",
      "Channel your energy into one project instead of five.",
    ],
  },
  {
    name: "taurus",
    dates: "Apr 20 – May 20",
    element: "Earth",
    forecasts: [
      "Comfort calls, but a small change of routine will refresh you.",
      "Financial patience beats an impulse purchase today.",
      "A home-cooked meal and an early night restore your balance.",
    ],
  },
  {
    name: "gemini",
    dates: "May 21 – Jun 20",
    element: "Air",
    forecasts: [
      "A conversation you've been putting off turns out to be surprisingly easy.",
      "Your curiosity leads you to a genuinely useful piece of information.",
      "Too many tabs open — in life as well as in your browser.",
    ],
  },
  {
    name: "cancer",
    dates: "Jun 21 – Jul 22",
    element: "Water",
    forecasts: [
      "Trust the friend who reaches out; they mean more than they say.",
      "Old memories surface gently rather than painfully today.",
      "Protect your energy — rest is productive too.",
    ],
  },
  {
    name: "leo",
    dates: "Jul 23 – Aug 22",
    element: "Fire",
    forecasts: [
      "Your natural warmth draws people toward you; use it generously.",
      "A creative idea deserves a real audience, not just a notebook.",
      "Avoid the spotlight for one day and listen instead.",
    ],
  },
  {
    name: "virgo",
    dates: "Aug 23 – Sep 22",
    element: "Earth",
    forecasts: [
      "A careful review catches a detail everyone else missed.",
      "Perfection is the enemy of finished — ship the good version.",
      "Your practical advice is exactly what someone needs.",
    ],
  },
  {
    name: "libra",
    dates: "Sep 23 – Oct 22",
    element: "Air",
    forecasts: [
      "A fair compromise is closer than you think.",
      "Beauty and order in your surroundings lift your mood today.",
      "Indecision costs more than a slightly imperfect choice.",
    ],
  },
  {
    name: "scorpio",
    dates: "Oct 23 – Nov 21",
    element: "Water",
    forecasts: [
      "Your intuition is sharp; trust the quiet signal.",
      "Let go of a grudge that has been taking up valuable space.",
      "Intensity works best when aimed at something you love.",
    ],
  },
  {
    name: "sagittarius",
    dates: "Nov 22 – Dec 21",
    element: "Fire",
    forecasts: [
      "A plan for the future becomes clearer after a honest conversation.",
      "Your optimism is contagious — spread it deliberately.",
      "Adventure can be a new idea, not only a new place.",
    ],
  },
  {
    name: "capricorn",
    dates: "Dec 22 – Jan 19",
    element: "Earth",
    forecasts: [
      "Steady progress finally becomes visible to others.",
      "A boundary you set protects more than it offends.",
      "Long-term discipline is quietly building your freedom.",
    ],
  },
  {
    name: "aquarius",
    dates: "Jan 20 – Feb 18",
    element: "Air",
    forecasts: [
      "An unconventional idea finds an unexpectedly receptive audience.",
      "Step back from the group and see the pattern clearly.",
      "Your detachment is a strength when paired with empathy.",
    ],
  },
  {
    name: "pisces",
    dates: "Feb 19 – Mar 20",
    element: "Water",
    forecasts: [
      "A creative project asks for a little more of your time today.",
      "You absorb other people's moods — remember which ones are yours.",
      "A quiet moment by water restores your compass.",
    ],
  },
];

export default createCommand(
  {
    name: "horoscope",
    description:
      "Generate today's deterministic horoscope for any of the twelve zodiac signs with a lucky number.",
    category: "entertainment",
    async run(context: CommandContext): Promise<CommandResult> {
      const requested = context.args.positional[0]?.toLowerCase();
      if (requested === undefined) {
        return {
          text: `🔮 **Horoscope**\nUsage: \`!horoscope <sign>\`\nSigns: ${SIGNS.map((sign) => sign.name).join(", ")}.`,
        };
      }
      const sign = SIGNS.find((entry) => entry.name === requested);
      if (sign === undefined)
        return {
          text: `❌ Unknown sign "${requested}". Choose from ${SIGNS.map((entry) => entry.name).join(", ")}.`,
        };
      const seed = sha256(`${new Date().toISOString().slice(0, 10)}|${sign.name}|horoscope`);
      const forecast = sign.forecasts[parseInt(seed.slice(0, 4), 16) % sign.forecasts.length]!;
      const luckyNumber = (parseInt(seed.slice(4, 8), 16) % 99) + 1;
      const compatible = SIGNS[parseInt(seed.slice(8, 12), 16) % SIGNS.length]!;
      return {
        text: `🔮 **Horoscope — ${sign.name.charAt(0).toUpperCase() + sign.name.slice(1)}** (${sign.dates})\n\n${forecast}\n\nElement: ${sign.element} · Lucky number: ${formatInteger(luckyNumber)} · Compatible energy: ${compatible.name}\nYour forecast is stable for the same UTC day.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!horoscope <sign>", "!horoscope leo"],
    examples: ["!horoscope aries", "!horoscope scorpio"],
    permission: "public",
    cooldownMs: 1500,
  },
);
