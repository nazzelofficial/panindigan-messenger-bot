import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

const CODE128_ALPHABET = /^[\x20-\x7E]{1,100}$/;

export default createCommand(
  {
    name: "barcode",
    description: "Create a real Code 128 barcode image link through the public bwip-js service.",
    category: "utility",
    async run(context: CommandContext): Promise<CommandResult> {
      const data = context.args.raw.replace(/^\S+\s*/, "").trim();
      if (!data)
        return { text: "Provide printable ASCII data to encode, for example: !barcode PKG-12345" };
      if (!CODE128_ALPHABET.test(data)) {
        return {
          text: "Code 128 here accepts 1–100 printable ASCII characters (no line breaks or non-ASCII symbols).",
        };
      }
      const url = new URL("https://bwipjs-api.metafloor.com/");
      url.searchParams.set("bcid", "code128");
      url.searchParams.set("text", data);
      url.searchParams.set("scale", "3");
      url.searchParams.set("height", "10");
      url.searchParams.set("includetext", "true");
      return { text: `Code 128 barcode for "${data}":\n${url.toString()}` };
    },
  },
  {
    aliases: [],
    usage: ["!barcode DATA"],
    examples: ["!barcode PKG-12345", "!barcode https://example.com"],
    permission: "public",
    cooldownMs: 500,
  },
);
