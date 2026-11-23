import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

const MAX_DATA_LENGTH = 1000;

export default createCommand(
  {
    name: "qr",
    description: "Generate a real QR code image link for text or a URL via goqr.me's public API.",
    category: "utility",
    async run(context: CommandContext): Promise<CommandResult> {
      const data = context.args.raw.replace(/^\S+\s*/, "").trim();
      if (!data)
        return { text: "Provide the text or URL to encode, for example: !qr https://example.com" };
      if (data.length > MAX_DATA_LENGTH)
        return { text: `QR payload is too long (maximum ${MAX_DATA_LENGTH} characters).` };
      const requestedSize = Number(context.args.named.size ?? "300");
      const size = Number.isFinite(requestedSize)
        ? Math.min(1000, Math.max(100, Math.trunc(requestedSize)))
        : 300;
      const url = new URL("https://api.qrserver.com/v1/create-qr-code/");
      url.searchParams.set("size", `${size}x${size}`);
      url.searchParams.set("data", data);
      return { text: `QR code for your text (${size}×${size} PNG):\n${url.toString()}` };
    },
  },
  {
    aliases: [],
    usage: ["!qr TEXT_OR_URL [--size=300]"],
    examples: ["!qr https://example.com", "!qr Hello world --size=500"],
    permission: "public",
    cooldownMs: 500,
  },
);
