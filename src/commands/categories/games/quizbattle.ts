import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { pickRandom, randomInt, sha256 } from "../../../utils/crypto.js";
import { formatInteger } from "../../../utils/text.js";

interface Question {
  readonly question: string;
  readonly options: readonly string[];
  readonly answer: number;
}

const QUESTIONS: readonly Question[] = [
  {
    question: "What is the capital of Japan?",
    options: ["Kyoto", "Tokyo", "Osaka", "Nara"],
    answer: 1,
  },
  {
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Jupiter", "Mars", "Mercury"],
    answer: 2,
  },
  {
    question: "How many bones are in the adult human body?",
    options: ["186", "206", "226", "246"],
    answer: 1,
  },
  {
    question: "What is the largest ocean on Earth?",
    options: ["Atlantic", "Indian", "Arctic", "Pacific"],
    answer: 3,
  },
  {
    question: "Which element has the chemical symbol 'Au'?",
    options: ["Silver", "Gold", "Argon", "Aluminium"],
    answer: 1,
  },
  {
    question: "In which year did the Berlin Wall fall?",
    options: ["1987", "1989", "1991", "1993"],
    answer: 1,
  },
  {
    question: "What is the hardest naturally occurring substance?",
    options: ["Quartz", "Diamond", "Granite", "Corundum"],
    answer: 1,
  },
  {
    question: "Who wrote 'Pride and Prejudice'?",
    options: ["Jane Austen", "Charles Dickens", "Emily Bronte", "George Eliot"],
    answer: 0,
  },
  {
    question: "Which gas do plants absorb during photosynthesis?",
    options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"],
    answer: 2,
  },
  { question: "What is the smallest prime number?", options: ["0", "1", "2", "3"], answer: 2 },
  {
    question: "Which continent is the Sahara Desert located on?",
    options: ["Asia", "Africa", "South America", "Australia"],
    answer: 1,
  },
  { question: "How many sides does a heptagon have?", options: ["6", "7", "8", "9"], answer: 1 },
  {
    question: "Which language has the most native speakers worldwide?",
    options: ["English", "Hindi", "Spanish", "Mandarin Chinese"],
    answer: 3,
  },
  {
    question: "What is the speed of light in a vacuum (approx.)?",
    options: ["150,000 km/s", "300,000 km/s", "450,000 km/s", "600,000 km/s"],
    answer: 1,
  },
  {
    question: "Which organ pumps blood through the body?",
    options: ["Liver", "Lungs", "Heart", "Kidney"],
    answer: 2,
  },
  {
    question: "What is the currency of South Korea?",
    options: ["Yen", "Won", "Ringgit", "Baht"],
    answer: 1,
  },
];

function dailyQuestions(senderId: string): Question[] {
  const seed = sha256(`${new Date().toISOString().slice(0, 10)}|${senderId}|quizbattle`);
  const start = parseInt(seed.slice(0, 4), 16) % QUESTIONS.length;
  const step = 1 + (parseInt(seed.slice(4, 8), 16) % 5);
  return Array.from(
    { length: 5 },
    (_, index) => QUESTIONS[(start + index * step) % QUESTIONS.length]!,
  );
}

function botAnswer(question: Question): number {
  if (randomInt(1, 100) <= 70) return question.answer;
  const wrong = question.options
    .map((_, index) => index)
    .filter((index) => index !== question.answer);
  return pickRandom(wrong);
}

export default createCommand(
  {
    name: "quizbattle",
    description:
      "Battle the bot over five daily trivia questions and compute both scores from real answers.",
    category: "games",
    async run(context: CommandContext): Promise<CommandResult> {
      const questions = dailyQuestions(context.senderId);
      const answers = context.args.positional;
      if (answers.length === 0) {
        const listing = questions
          .map(
            (question, index) =>
              `**${index + 1}.** ${question.question}\n${question.options.map((option, i) => `${"ABCD"[i]}) ${option}`).join(" · ")}`,
          )
          .join("\n\n");
        return {
          text: `⚔️ **Quiz Battle** — answer all five with their letters:\n\n${listing}\n\nUsage: \`!quizbattle ABCDE\` (one letter A–D per question).`,
        };
      }
      if (answers.length !== 5)
        return {
          text: `❌ Supply exactly five answers (A–D), one per question. You gave ${formatInteger(answers.length)}.`,
        };
      let playerScore = 0;
      let botScore = 0;
      const lines: string[] = [];
      for (let index = 0; index < 5; index += 1) {
        const answer = answers[index]!.toUpperCase();
        if (!/^[A-D]$/.test(answer))
          return { text: `❌ Answer ${formatInteger(index + 1)} must be A, B, C or D.` };
        const chosen = answer.charCodeAt(0) - 65;
        const correct = chosen === questions[index]!.answer;
        if (correct) playerScore += 1;
        const botPick = botAnswer(questions[index]!);
        const botCorrect = botPick === questions[index]!.answer;
        if (botCorrect) botScore += 1;
        lines.push(
          `${index + 1}. ${correct ? "✅" : "❌"} You ${answer} · ${botCorrect ? "✅" : "❌"} Bot ${"ABCD"[botPick]} · Answer ${"ABCD"[questions[index]!.answer]}`,
        );
      }
      const verdict =
        playerScore > botScore
          ? "🎉 You win the battle!"
          : playerScore < botScore
            ? "🤖 Bot wins the battle."
            : "🤝 It's a draw!";
      return {
        text: `⚔️ **Quiz Battle** — ${verdict}\n\n${lines.join("\n")}\n\nScore: You ${formatInteger(playerScore)} – ${formatInteger(botScore)} Bot`,
      };
    },
  },
  {
    aliases: [],
    usage: ["!quizbattle", "!quizbattle <A-D> <A-D> <A-D> <A-D> <A-D>"],
    examples: ["!quizbattle", "!quizbattle B C B A D"],
    permission: "public",
    cooldownMs: 3000,
  },
);
