import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { sha256 } from "../../../utils/crypto.js";

interface TriviaQuestion {
  readonly question: string;
  readonly options: readonly string[];
  readonly answer: number;
  readonly explanation: string;
}

const QUESTIONS: readonly TriviaQuestion[] = [
  {
    question: "Which planet has the most confirmed moons?",
    options: ["Jupiter", "Saturn", "Uranus", "Neptune"],
    answer: 1,
    explanation: "Saturn currently holds the record for confirmed moons.",
  },
  {
    question: "What is the chemical symbol for iron?",
    options: ["Ir", "Fe", "FI", "I"],
    answer: 1,
    explanation: "Fe comes from the Latin word ferrum.",
  },
  {
    question: "In which year was the first iPhone released?",
    options: ["2005", "2007", "2009", "2011"],
    answer: 1,
    explanation: "Apple launched the original iPhone in June 2007.",
  },
  {
    question: "What is the largest desert on Earth by area?",
    options: ["The Sahara", "The Arctic", "Antarctica", "The Gobi"],
    answer: 2,
    explanation: "Antarctica is a polar desert and is larger than the Sahara.",
  },
  {
    question: "How many colours are in the traditional rainbow?",
    options: ["Five", "Six", "Seven", "Eight"],
    answer: 2,
    explanation: "Red, orange, yellow, green, blue, indigo and violet.",
  },
  {
    question: "Which instrument has exactly 88 keys?",
    options: ["Harpsichord", "Piano", "Accordion", "Organ"],
    answer: 1,
    explanation: "The standard modern piano has 88 keys.",
  },
  {
    question: "What is the capital city of Australia?",
    options: ["Sydney", "Melbourne", "Canberra", "Perth"],
    answer: 2,
    explanation: "Canberra was purpose-built as a compromise capital.",
  },
  {
    question: "Which planet is closest to the Sun?",
    options: ["Mercury", "Venus", "Earth", "Mars"],
    answer: 0,
    explanation: "Mercury orbits at about 58 million kilometres from the Sun.",
  },
  {
    question: "What is the tallest mountain above sea level?",
    options: ["K2", "Mount Everest", "Kangchenjunga", "Makalu"],
    answer: 1,
    explanation: "Mount Everest stands at roughly 8,849 metres.",
  },
  {
    question: "Which blood cells fight infections?",
    options: ["Red blood cells", "Platelets", "White blood cells", "Plasma cells"],
    answer: 2,
    explanation: "White blood cells are the immune system's defenders.",
  },
  {
    question: "Which gas makes up most of Earth's atmosphere?",
    options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Argon"],
    answer: 1,
    explanation: "Nitrogen makes up about 78% of the atmosphere.",
  },
  {
    question: "Who painted the Mona Lisa?",
    options: ["Michelangelo", "Raphael", "Leonardo da Vinci", "Donatello"],
    answer: 2,
    explanation: "Leonardo da Vinci painted it in the early 1500s.",
  },
  {
    question: "Which mineral scores 10 on the Mohs hardness scale?",
    options: ["Quartz", "Corundum", "Topaz", "Diamond"],
    answer: 3,
    explanation: "Diamond is the hardest mineral on the Mohs scale.",
  },
  {
    question: "Which ocean is the deepest on average?",
    options: ["Atlantic", "Indian", "Pacific", "Arctic"],
    answer: 2,
    explanation: "The Pacific has the greatest average depth.",
  },
  {
    question: "How many continents are there in the common model?",
    options: ["Five", "Six", "Seven", "Eight"],
    answer: 2,
    explanation: "Africa, Antarctica, Asia, Australia, Europe, North and South America.",
  },
  {
    question: "What is the SI unit of force?",
    options: ["Joule", "Watt", "Newton", "Pascal"],
    answer: 2,
    explanation: "One newton is the force needed to accelerate 1 kg by 1 m/s².",
  },
  {
    question: "Which vitamin does sunlight help the body produce?",
    options: ["Vitamin A", "Vitamin C", "Vitamin D", "Vitamin K"],
    answer: 2,
    explanation: "UVB light triggers vitamin D synthesis in the skin.",
  },
  {
    question: "What is the largest animal ever known?",
    options: ["African elephant", "Blue whale", "Great white shark", "Giraffe"],
    answer: 1,
    explanation: "The blue whale can exceed 30 metres in length.",
  },
  {
    question: "In which country did the ancient Olympic Games begin?",
    options: ["Italy", "Egypt", "Greece", "Turkey"],
    answer: 2,
    explanation: "The games began at Olympia in ancient Greece.",
  },
  {
    question: "At what temperature does water boil at sea level?",
    options: ["90°C", "95°C", "100°C", "110°C"],
    answer: 2,
    explanation: "Water boils at 100°C at standard atmospheric pressure.",
  },
];

function dailyQuestion(): TriviaQuestion {
  const seed = sha256(`${new Date().toISOString().slice(0, 10)}|trivia`);
  return QUESTIONS[parseInt(seed.slice(0, 8), 16) % QUESTIONS.length]!;
}

export default createCommand(
  {
    name: "trivia",
    description: "Answer a daily multiple-choice trivia question and see a verified explanation.",
    category: "entertainment",
    async run(context: CommandContext): Promise<CommandResult> {
      const question = dailyQuestion();
      const raw = context.args.positional[0];
      if (raw === undefined) {
        return {
          text: `🎓 **Trivia of the Day**\n\n${question.question}\n\n${question.options.map((option, index) => `${"ABCD"[index]}) ${option}`).join("\n")}\n\nUsage: \`!trivia A\` (or B, C, D).`,
        };
      }
      const answer = raw.toUpperCase();
      if (!/^[A-D]$/.test(answer))
        return { text: "❌ Answer with A, B, C or D, e.g. `!trivia B`." };
      const chosen = answer.charCodeAt(0) - 65;
      const correct = chosen === question.answer;
      return {
        text: `🎓 **Trivia** — ${correct ? "✅ Correct!" : "❌ Incorrect."}\n\n${question.question}\nYour answer: ${answer}) ${question.options[chosen]}\nCorrect answer: ${"ABCD"[question.answer]}) ${question.options[question.answer]}\n\n💡 ${question.explanation}`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!trivia", "!trivia <A-D>"],
    examples: ["!trivia", "!trivia B"],
    permission: "public",
    cooldownMs: 1200,
  },
);
