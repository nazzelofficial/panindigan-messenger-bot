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

async function fetchImageBytes(
  url: URL,
  maximumBytes: number,
): Promise<{ readonly bytes: Buffer; readonly contentType: string }> {
  const head = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(8_000) }).catch(
    () => undefined,
  );
  let contentType = "";
  if (head?.ok) {
    contentType = (head.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
    const declared = Number(head.headers.get("content-length") ?? "0");
    if (Number.isFinite(declared) && declared > maximumBytes)
      throw new Error("The declared image size exceeds the limit.");
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Image URL returned HTTP ${response.status}.`);
  if (contentType === "")
    contentType = (response.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > maximumBytes)
    throw new Error("The image was empty or exceeded the size limit.");
  return { bytes, contentType };
}

function failure(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export default createCommand(
  {
    name: "toimage",
    description:
      "Turn a direct image URL or an existing attachment ID into a Messenger image attachment.",
    category: "media",
    async run(context: CommandContext): Promise<CommandResult> {
      const input = context.args.positional[0];
      if (!input)
        return { text: "Usage: !toimage <direct image URL> or !toimage <numeric attachment ID>." };
      const client = context.messenger.raw();
      if (!client) return { text: "Messenger is not connected, so no image could be sent." };
      try {
        let bytes: Buffer;
        let contentType = "image";
        if (/^\d{5,25}$/.test(input)) {
          bytes = await client.downloadAttachment(input);
        } else {
          const url = parseHttpUrl(input);
          if (!url)
            return {
              text: "The argument must be a direct http(s) image URL or a numeric attachment ID.",
            };
          const image = await fetchImageBytes(url, 25_000_000);
          if (!image.contentType.startsWith("image/")) {
            return {
              text: `The URL returned "${image.contentType || "unknown"}" instead of an image type. Nothing was sent.`,
            };
          }
          bytes = image.bytes;
          contentType = image.contentType;
        }
        const result = await client.sendAttachment(context.threadId, bytes);
        return {
          text: `🖼️ Image sent as an attachment (message ${result.messageId}). Type: ${contentType}; size: ${Math.round(bytes.byteLength / 1024)} KiB.`,
        };
      } catch (error) {
        return { text: `Image conversion failed: ${failure(error)}. Nothing was sent.` };
      }
    },
  },
  {
    aliases: [],
    usage: ["!toimage <direct image URL>", "!toimage <attachment ID>"],
    examples: ["!toimage https://example.org/photo.jpg"],
    permission: "public",
    cooldownMs: 3000,
  },
);
