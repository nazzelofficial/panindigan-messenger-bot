import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { fetchJson } from "../../../utils/http.js";
import { pickRandom } from "../../../utils/crypto.js";

interface QuoteResponse {
  readonly content?: string;
  readonly author?: string;
}

interface Quote {
  readonly content: string;
  readonly author: string;
}

const FALLBACK_QUOTES: readonly Quote[] = [
  { content: "The only thing we have to fear is fear itself.", author: "Franklin D. Roosevelt" },
  { content: "Be the change that you wish to see in the world.", author: "Mahatma Gandhi" },
  { content: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
  {
    content: "It does not matter how slowly you go as long as you do not stop.",
    author: "Confucius",
  },
  {
    content: "The best time to plant a tree was 20 years ago. The second best time is now.",
    author: "Chinese proverb",
  },
  { content: "What you do today can improve all your tomorrows.", author: "Ralph Marston" },
  {
    content:
      "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    author: "Winston Churchill",
  },
  { content: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  {
    content: "Whether you think you can or you think you can't, you're right.",
    author: "Henry Ford",
  },
  {
    content: "Everything you've ever wanted is on the other side of fear.",
    author: "George Addair",
  },
  {
    content: "Happiness is not something ready made. It comes from your own actions.",
    author: "Dalai Lama",
  },
  { content: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { content: "If you can dream it, you can do it.", author: "Walt Disney" },
  { content: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
  { content: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  {
    content: "Our greatest glory is not in never falling, but in rising every time we fall.",
    author: "Confucius",
  },
  { content: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  {
    content: "The future belongs to those who believe in the beauty of their dreams.",
    author: "Eleanor Roosevelt",
  },
  { content: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
  { content: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
];

export default createCommand(
  {
    name: "quoteoftheday",
    description:
      "Fetch a live inspiration quote, with a curated twenty-quote fallback when the API is down.",
    category: "entertainment",
    async run(context: CommandContext): Promise<CommandResult> {
      try {
        const response = await fetchJson<QuoteResponse>("https://api.quotable.io/random");
        if (typeof response.content !== "string" || response.content.length === 0) {
          throw new Error("Quote API returned an empty quote.");
        }
        return {
          text: `✨ **Quote of the Day**\n\n“${response.content}”\n\n— ${response.author ?? "Unknown"}\n\nFetched live from Quotable.`,
        };
      } catch (error) {
        context.logger.warn({ error }, "quote API unavailable, using curated fallback");
        const quote = pickRandom(FALLBACK_QUOTES);
        return {
          text: `✨ **Quote of the Day**\n\n“${quote.content}”\n\n— ${quote.author}\n\nCurated offline selection — the live quote service is temporarily unavailable.`,
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!quoteoftheday"],
    examples: ["!quoteoftheday"],
    permission: "public",
    cooldownMs: 2500,
  },
);
