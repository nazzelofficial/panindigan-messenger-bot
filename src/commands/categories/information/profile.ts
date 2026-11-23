import type { UserInfo } from "panindigan-automate";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

async function loadUser(context: CommandContext): Promise<UserInfo | undefined> {
  const target = context.args.positional[0] ?? context.senderId;
  try {
    return await context.messenger.getUser(target);
  } catch {
    return undefined;
  }
}

export default createCommand(
  {
    name: "profile",
    description: "Show a Messenger account's public name, username and profile links.",
    category: "information",
    async run(context: CommandContext): Promise<CommandResult> {
      const user = await loadUser(context);
      if (!user) {
        return {
          text: "Could not load that profile. Check the user ID or try again when Messenger is connected.",
        };
      }
      const lines = [
        `Profile: ${user.name ?? "Unnamed account"}`,
        `ID: ${user.id}`,
        user.vanity ? `Username: ${user.vanity}` : undefined,
        user.firstName ? `First name: ${user.firstName}` : undefined,
        `Verified: ${user.isVerified ? "yes" : "no"}`,
        `Friend: ${user.isFriend ? "yes" : "no"}`,
        user.profileUrl ? `Profile link: ${user.profileUrl}` : undefined,
        user.photoUrl ? `Photo: ${user.photoUrl}` : undefined,
      ].filter((line): line is string => line !== undefined);
      return { text: lines.join("\n") };
    },
  },
  {
    aliases: [],
    usage: ["!profile [userId]"],
    examples: ["!profile", "!profile 1234567890"],
    permission: "public",
    cooldownMs: 1000,
  },
);
