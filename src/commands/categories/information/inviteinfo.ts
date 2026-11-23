import type { ThreadInfo } from "panindigan-automate";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "inviteinfo",
    description: "Explain invite-link support for the current thread without fabricating a link.",
    category: "information",
    async run(context: CommandContext): Promise<CommandResult> {
      let thread: ThreadInfo | undefined;
      try {
        thread = await context.messenger.getThread(context.threadId);
      } catch {
        thread = undefined;
      }
      const identity = thread?.name ?? context.threadName ?? "this thread";
      const lines = [
        `Invite information for: ${identity}`,
        `Thread ID: ${context.threadId}`,
        `Type: ${(thread?.isGroup ?? context.isGroup) ? "group" : "direct chat"}`,
        "",
        "Verifiable per-thread invite-link creation is not supported by the panindigan-automate library: its createInviteLink() method raises NotImplementedError because Facebook exposes no reliable public endpoint for it. No link is invented here.",
        "If you need an invite link, create one from the Facebook app's group settings.",
      ];
      return { text: lines.join("\n") };
    },
  },
  {
    aliases: [],
    usage: ["!inviteinfo"],
    examples: ["!inviteinfo"],
    permission: "public",
    cooldownMs: 1000,
  },
);
