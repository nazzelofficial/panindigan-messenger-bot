import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { sha256 } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

interface QuizQuestion {
  readonly question: string;
  readonly options: readonly string[];
  readonly answer: number;
}

const BANK: readonly QuizQuestion[] = [
  { question: "What is 7 × 8?", options: ["48", "54", "56", "64"], answer: 2 },
  {
    question: "Which is the largest prime number below 30?",
    options: ["29", "27", "23", "19"],
    answer: 0,
  },
  {
    question: "What is the capital of Canada?",
    options: ["Toronto", "Ottawa", "Vancouver", "Montreal"],
    answer: 1,
  },
  {
    question: "Which planet is known for its rings?",
    options: ["Mars", "Jupiter", "Saturn", "Uranus"],
    answer: 2,
  },
  {
    question: "How many legs does a spider have?",
    options: ["Six", "Eight", "Ten", "Twelve"],
    answer: 1,
  },
  {
    question: "What is the chemical formula for water?",
    options: ["CO2", "H2O", "O2", "NaCl"],
    answer: 1,
  },
  {
    question: "Which language uses the Hangul script?",
    options: ["Japanese", "Chinese", "Korean", "Thai"],
    answer: 2,
  },
  {
    question: "Which artist cut off part of his own ear?",
    options: ["Picasso", "Van Gogh", "Monet", "Da Vinci"],
    answer: 1,
  },
  {
    question: "What is the largest organ of the human body?",
    options: ["Liver", "Skin", "Brain", "Lung"],
    answer: 1,
  },
  {
    question: "Which mountain range separates Europe from Asia?",
    options: ["Alps", "Andes", "Urals", "Rockies"],
    answer: 2,
  },
  {
    question: "What does the 'S' in HTTPS stand for?",
    options: ["Secure", "Server", "Simple", "Standard"],
    answer: 0,
  },
  {
    question: "Which sea creature has three hearts?",
    options: ["Dolphin", "Octopus", "Shark", "Jellyfish"],
    answer: 1,
  },
  {
    question: "How many minutes are in a full day?",
    options: ["1,200", "1,440", "1,680", "2,400"],
    answer: 1,
  },
  {
    question: "Which instrument is tuned to concert pitch A = 440 Hz?",
    options: ["Violin", "Flute", "All of them", "None of them"],
    answer: 2,
  },
  {
    question: "Which country has the most people?",
    options: ["China", "India", "United States", "Indonesia"],
    answer: 1,
  },
  {
    question: "What is the freezing point of water in Fahrenheit?",
    options: ["0°F", "12°F", "32°F", "45°F"],
    answer: 2,
  },
  {
    question: "Which bone is the longest in the human body?",
    options: ["Femur", "Tibia", "Humerus", "Radius"],
    answer: 0,
  },
  {
    question: "Which planet rotates on its side?",
    options: ["Venus", "Uranus", "Neptune", "Mercury"],
    answer: 1,
  },
  { question: "What is the square root of 144?", options: ["10", "11", "12", "13"], answer: 2 },
  {
    question: "Which animal is known as the 'ship of the desert'?",
    options: ["Llama", "Camel", "Donkey", "Horse"],
    answer: 1,
  },
];

function dailyQuestions(): QuizQuestion[] {
  const seed = sha256(`${new Date().toISOString().slice(0, 10)}|quiz`);
  const start = parseInt(seed.slice(0, 4), 16) % BANK.length;
  const step = 1 + (parseInt(seed.slice(4, 8), 16) % 4);
  return Array.from({ length: 5 }, (_, index) => BANK[(start + index * step) % BANK.length]!);
}

function grade(score: number): string {
  if (score === 5) return "perfect score — brilliant!";
  if (score >= 4) return "excellent work";
  if (score >= 3) return "a solid pass";
  if (score >= 1) return "keep practising";
  return "better luck tomorrow";
}

export default createCommand(
  {
    name: "quiz",
    description:
      "Take a five-question daily quiz and get a real scored result in a single message.",
    category: "entertainment",
    async run(context: CommandContext): Promise<CommandResult> {
      const questions = dailyQuestions();
      const answers = context.args.positional;
      if (answers.length === 0) {
        const listing = questions
          .map(
            (question, index) =>
              `**${index + 1}.** ${question.question}\n${question.options.map((option, i) => `${"ABCD"[i]}) ${option}`).join(" · ")}`,
          )
          .join("\n\n");
        return {
          text: `📝 **Daily Quiz** — five questions.\n\n${listing}\n\nUsage: \`!quiz ABCDE\` (one letter per question, in order).`,
        };
      }
      if (answers.length !== 5)
        return {
          text: `❌ Provide exactly five answers. You gave ${formatInteger(answers.length)}.`,
        };
      let score = 0;
      const details: string[] = [];
      for (let index = 0; index < 5; index += 1) {
        const answer = answers[index]!.toUpperCase();
        if (!/^[A-D]$/.test(answer))
          return { text: `❌ Answer ${formatInteger(index + 1)} must be A, B, C or D.` };
        const correct = answer.charCodeAt(0) - 65 === questions[index]!.answer;
        if (correct) score += 1;
        details.push(
          `${index + 1}. ${correct ? "✅" : `❌ (correct: ${"ABCD"[questions[index]!.answer]})`} ${questions[index]!.question}`,
        );
      }
      return {
        text: `📝 **Daily Quiz Results** — ${formatInteger(score)}/5 (${formatInteger(score * 20)}%) — ${grade(score)}\n\n${details.join("\n")}\n\nCome back tomorrow for a new set.`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!quiz", "!quiz <A-D> <A-D> <A-D> <A-D> <A-D>"],
    examples: ["!quiz", "!quiz A B C D E"],
    permission: "public",
    cooldownMs: 3000,
  },
);
