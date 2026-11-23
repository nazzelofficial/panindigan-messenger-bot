import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

function parseHttpUrl(value: string | undefined): URL | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url : undefined;
  } catch {
    return undefined;
  }
}

async function fetchImageBytes(url: URL, maximumBytes: number): Promise<Buffer> {
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Image URL returned HTTP ${response.status}.`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > maximumBytes)
    throw new Error("The image was empty or exceeded the size limit.");
  return bytes;
}

function failure(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export default createCommand(
  {
    name: "unsticker",
    description: "Re-send a sticker or photo attachment as a normal Messenger image attachment.",
    category: "media",
    async run(context: CommandContext): Promise<CommandResult> {
      const id = context.args.positional[0];
      if (!id || !/^\d{5,25}$/.test(id)) {
        return { text: "Usage: !unsticker <numeric sticker or photo attachment ID>." };
      }
      const client = context.messenger.raw();
      if (!client) return { text: "Messenger is not connected, so nothing could be re-sent." };
      let bytes: Buffer | undefined;
      try {
        bytes = await client.downloadAttachment(id);
      } catch {
        // Not every sticker id is downloadable; try the photo redirect endpoint next.
      }
      if (!bytes) {
        try {
          const photoUrl = parseHttpUrl(await client.resolvePhotoUrl(id));
          if (photoUrl) bytes = await fetchImageBytes(photoUrl, 20_000_000);
        } catch {
          // Reported below if no bytes were obtained.
        }
      }
      if (!bytes) {
        return {
          text: `No downloadable media was found for attachment ${id}. Nothing was re-sent.`,
        };
      }
      try {
        const result = await client.sendAttachment(context.threadId, bytes);
        return {
          text: `Attachment ${id} was re-sent as a regular image/file (message ${result.messageId}).`,
        };
      } catch (error) {
        return {
          text: `Re-sending attachment ${id} failed: ${failure(error)}. Nothing was re-sent.`,
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!unsticker <attachment ID>"],
    examples: ["!unsticker 1234567890123456"],
    permission: "public",
    cooldownMs: 3000,
  },
);
