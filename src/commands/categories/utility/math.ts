import { evaluateExpression, ExpressionError } from "./calc.js";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "math",
    description: "Run the safe expression engine in degree mode and show rounded result formats.",
    category: "utility",
    async run(context: CommandContext): Promise<CommandResult> {
      let expression = context.args.raw.replace(/^\S+\s*/, "").trim();
      const degrees =
        /(?:^|\s)degrees(?:\s|$)/i.test(expression) || context.args.named.degrees === "true";
      expression = expression
        .replace(/(?:^|\s)degrees(?:\s|$)/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (!expression) {
        return {
          text: "Supported: + - * / % ^, parentheses, pi, e and sqrt/sin/cos/tan/log/abs. Add the word degrees for degree-based trigonometry.",
        };
      }
      try {
        const result = evaluateExpression(expression, { degrees });
        return {
          text: [
            `${expression} = ${Number(result.toPrecision(12))}`,
            `Rounded: ${result.toFixed(4)} (4 dp) / ${Number(result.toFixed(2))} (2 dp)`,
            `Trig mode: ${degrees ? "degrees" : "radians"}`,
          ].join("\n"),
        };
      } catch (error) {
        return {
          text: `Math error: ${error instanceof ExpressionError ? error.message : "invalid expression"}`,
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!math EXPRESSION [degrees]"],
    examples: ["!math sin(30) degrees", "!math 2^10 + log(100)"],
    permission: "public",
    cooldownMs: 500,
  },
);
