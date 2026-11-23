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

interface RemoteFile {
  readonly bytes: Buffer;
  readonly contentType: string;
}

async function downloadRemote(url: URL, maximumBytes: number): Promise<RemoteFile> {
  let declared = 0;
  let contentType = "";
  try {
    const head = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(8_000) });
    if (head.ok) {
      contentType = (head.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
      declared = Number(head.headers.get("content-length") ?? "0");
    }
  } catch {
    // Some hosts reject HEAD; the capped GET below still enforces the limit.
  }
  if (Number.isFinite(declared) && declared > maximumBytes) {
    throw new Error("The declared file size exceeds the configured limit.");
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Download returned HTTP ${response.status}.`);
  if (contentType === "") {
    contentType = (response.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength === 0) throw new Error("The remote file was empty.");
  if (bytes.byteLength > maximumBytes)
    throw new Error("The downloaded file exceeds the configured size limit.");
  return { bytes, contentType };
}

function failure(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export default createCommand(
  {
    name: "voice",
    description: "Send a direct audio URL under 25 MB as an actual Messenger voice message.",
    category: "media",
    async run(context: CommandContext): Promise<CommandResult> {
      const url = parseHttpUrl(context.args.positional[0]);
      if (!url)
        return { text: "Usage: !voice <direct http(s) audio URL>. Use an mp3, m4a or ogg file." };
      const client = context.messenger.raw();
      if (!client)
        return { text: "Messenger is not connected, so no voice message could be sent." };
      const maximumBytes = 25_000_000;
      try {
        const file = await downloadRemote(url, maximumBytes);
        if (!file.contentType.startsWith("audio/")) {
          return {
            text: `The URL returned "${file.contentType || "unknown"}" instead of an audio type. No voice message was sent.`,
          };
        }
        const result = await client.sendVoiceMessage(context.threadId, file.bytes);
        return {
          text: `🎙️ Voice message sent (message ${result.messageId}). Type: ${file.contentType}; size: ${Math.round(file.bytes.byteLength / 1024)} KiB.`,
        };
      } catch (error) {
        return { text: `Voice message failed: ${failure(error)}. Nothing was sent.` };
      }
    },
  },
  {
    aliases: [],
    usage: ["!voice <direct audio URL>"],
    examples: ["!voice https://example.org/audio/voice.mp3"],
    permission: "public",
    cooldownMs: 5000,
  },
);
