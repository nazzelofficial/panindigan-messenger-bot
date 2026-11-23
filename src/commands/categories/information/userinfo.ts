import type { UserInfo } from "panindigan-automate";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "userinfo",
    description:
      "Inspect detailed account metadata and last observed presence for a Messenger user.",
    category: "information",
    async run(context: CommandContext): Promise<CommandResult> {
      const target = context.args.positional[0] ?? context.senderId;
      let user: UserInfo | undefined;
      try {
        user = await context.messenger.getUser(target);
      } catch {
        return {
          text: "User lookup failed. The ID may be invalid or Messenger may be disconnected.",
        };
      }
      if (!user) return { text: "No user record was returned for that ID." };

      let presence = "unavailable";
      try {
        const client = context.messenger.raw();
        if (client) presence = (await client.getPresence(target)).status;
      } catch {
        presence = "unavailable";
      }

      const lines = [
        `User: ${user.name ?? "Unnamed account"} (${user.id})`,
        `Account type: ${user.type ?? "unknown"}`,
        `Gender: ${user.gender ?? "not shared"}`,
        `Birthday today: ${user.isBirthday ? "yes" : "no"}`,
        `Verified: ${user.isVerified ? "yes" : "no"} / Friend: ${user.isFriend ? "yes" : "no"}`,
        `Presence: ${presence}`,
        user.vanity ? `Vanity URL: https://www.facebook.com/${user.vanity}` : "Vanity URL: none",
      ];
      return { text: lines.join("\n") };
    },
  },
  {
    aliases: [],
    usage: ["!userinfo [userId]"],
    examples: ["!userinfo", "!userinfo 1234567890"],
    permission: "public",
    cooldownMs: 1000,
  },
);
