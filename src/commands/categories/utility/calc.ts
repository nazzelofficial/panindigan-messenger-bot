import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

type Token =
  | { readonly kind: "number"; readonly value: number }
  | { readonly kind: "identifier"; readonly value: string }
  | { readonly kind: "operator"; readonly value: "+" | "-" | "*" | "/" | "%" | "^" }
  | { readonly kind: "paren"; readonly value: "(" | ")" };

export class ExpressionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ExpressionError";
  }
}

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < expression.length) {
    const character = expression[index];
    if (character === undefined) break;
    if (/\s/.test(character)) {
      index += 1;
      continue;
    }
    const isDigit = (value: string | undefined): boolean =>
      value !== undefined && value >= "0" && value <= "9";
    if (isDigit(character) || (character === "." && isDigit(expression[index + 1]))) {
      let text = "";
      while (index < expression.length) {
        const current = expression[index];
        if (current === undefined) break;
        if (isDigit(current) || current === ".") {
          text += current;
          index += 1;
        } else {
          break;
        }
      }
      const value = Number(text);
      if (!Number.isFinite(value)) throw new ExpressionError(`Invalid number "${text}".`);
      tokens.push({ kind: "number", value });
      continue;
    }
    if (/[A-Za-z]/.test(character)) {
      let text = "";
      while (index < expression.length) {
        const current = expression[index];
        if (current === undefined) break;
        if (/[A-Za-z]/.test(current)) {
          text += current;
          index += 1;
        } else {
          break;
        }
      }
      tokens.push({ kind: "identifier", value: text.toLowerCase() });
      continue;
    }
    if (
      character === "+" ||
      character === "-" ||
      character === "*" ||
      character === "/" ||
      character === "%" ||
      character === "^"
    ) {
      tokens.push({ kind: "operator", value: character });
      index += 1;
      continue;
    }
    if (character === "(" || character === ")") {
      tokens.push({ kind: "paren", value: character });
      index += 1;
      continue;
    }
    throw new ExpressionError(`Unexpected character "${character}" at position ${index + 1}.`);
  }
  if (tokens.length === 0) throw new ExpressionError("Empty expression.");
  if (tokens.length > 200)
    throw new ExpressionError("Expression is too long (maximum 200 tokens).");
  return tokens;
}

class Parser {
  private position = 0;

  public constructor(
    private readonly tokens: readonly Token[],
    private readonly degrees: boolean,
  ) {}

  public parse(): number {
    const value = this.parseExpression();
    const leftover = this.peek();
    if (leftover) throw new ExpressionError(`Unexpected token "${leftover.value}".`);
    this.assertFinite(value);
    return value;
  }

  private peek(): Token | undefined {
    return this.tokens[this.position];
  }

  private take(): Token | undefined {
    const token = this.tokens[this.position];
    this.position += 1;
    return token;
  }

  private assertFinite(value: number): void {
    if (!Number.isFinite(value)) throw new ExpressionError("Result is not a finite number.");
  }

  private parseExpression(): number {
    let left = this.parseTerm();
    for (;;) {
      const token = this.peek();
      if (token?.kind !== "operator" || (token.value !== "+" && token.value !== "-")) break;
      this.take();
      const right = this.parseTerm();
      left = token.value === "+" ? left + right : left - right;
      this.assertFinite(left);
    }
    return left;
  }

  private parseTerm(): number {
    let left = this.parseUnary();
    for (;;) {
      const token = this.peek();
      if (
        token?.kind !== "operator" ||
        (token.value !== "*" && token.value !== "/" && token.value !== "%")
      )
        break;
      this.take();
      const right = this.parseUnary();
      if ((token.value === "/" || token.value === "%") && right === 0)
        throw new ExpressionError("Division by zero.");
      left = token.value === "*" ? left * right : token.value === "/" ? left / right : left % right;
      this.assertFinite(left);
    }
    return left;
  }

  private parseUnary(): number {
    const token = this.peek();
    if (token?.kind === "operator" && (token.value === "+" || token.value === "-")) {
      this.take();
      const value = this.parseUnary();
      return token.value === "-" ? -value : value;
    }
    return this.parsePower();
  }

  private parsePower(): number {
    const base = this.parsePrimary();
    const token = this.peek();
    if (token?.kind === "operator" && token.value === "^") {
      this.take();
      const exponent = this.parseUnary();
      const result = Math.pow(base, exponent);
      this.assertFinite(result);
      return result;
    }
    return base;
  }

  private parsePrimary(): number {
    const token = this.take();
    if (!token) throw new ExpressionError("Unexpected end of expression.");
    if (token.kind === "number") return token.value;
    if (token.kind === "paren") {
      if (token.value !== "(")
        throw new ExpressionError('Unexpected ")" — no matching opening parenthesis.');
      const value = this.parseExpression();
      const closing = this.take();
      if (closing?.kind !== "paren" || closing.value !== ")")
        throw new ExpressionError('Missing closing ")".');
      return value;
    }
    if (token.kind === "identifier") {
      if (token.value === "pi") return Math.PI;
      if (token.value === "e") return Math.E;
      const toRadians = (value: number): number => (this.degrees ? (value * Math.PI) / 180 : value);
      const functions: Readonly<Record<string, (value: number) => number>> = {
        sqrt: Math.sqrt,
        abs: Math.abs,
        log: Math.log,
        sin: (value) => Math.sin(toRadians(value)),
        cos: (value) => Math.cos(toRadians(value)),
        tan: (value) => Math.tan(toRadians(value)),
      };
      const fn = functions[token.value];
      if (!fn) throw new ExpressionError(`Unknown identifier "${token.value}".`);
      const opening = this.take();
      if (opening?.kind !== "paren" || opening.value !== "(") {
        throw new ExpressionError(
          `Function "${token.value}" requires parentheses, e.g. ${token.value}(2).`,
        );
      }
      const argument = this.parseExpression();
      const closing = this.take();
      if (closing?.kind !== "paren" || closing.value !== ")") {
        throw new ExpressionError(`Missing closing ")" for ${token.value}().`);
      }
      return fn(argument);
    }
    throw new ExpressionError(`Unexpected token "${token.value}".`);
  }
}

/** Evaluates arithmetic with a hand-written tokenizer and recursive-descent parser — never eval(). */
export function evaluateExpression(
  expression: string,
  options: { readonly degrees?: boolean } = {},
): number {
  return new Parser(tokenize(expression), options.degrees ?? false).parse();
}

export default createCommand(
  {
    name: "calc",
    description:
      "Safely evaluate an arithmetic expression (+ - * / % ^, parentheses and math functions).",
    category: "utility",
    async run(context: CommandContext): Promise<CommandResult> {
      const expression = context.args.raw.replace(/^\S+\s*/, "").trim();
      if (!expression)
        return { text: "Provide an expression, for example: !calc (12 + 8) * 2 / sqrt(4)" };
      try {
        const result = evaluateExpression(expression);
        return { text: `${expression} = ${Number(result.toPrecision(12))}` };
      } catch (error) {
        const message = error instanceof ExpressionError ? error.message : "invalid expression";
        return { text: `Cannot evaluate: ${message}` };
      }
    },
  },
  {
    aliases: [],
    usage: ["!calc EXPRESSION"],
    examples: ["!calc 2 + 3 * 4", "!calc sqrt(81) + 2^3", "!calc sin(pi/2)"],
    permission: "public",
    cooldownMs: 500,
  },
);
