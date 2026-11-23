import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "avatar",
    description: "Retrieve the profile photo URL of a Messenger user, or of yourself by default.",
    category: "information",
    async run(context: CommandContext): Promise<CommandResult> {
      const target = context.args.positional[0] ?? context.senderId;
      try {
        const user = await context.messenger.getUser(target);
        if (!user) return { text: "No profile was returned for that user ID." };
        if (!user.photoUrl) {
          return {
            text: `${user.name ?? user.id} has no public photo URL available.${user.profileUrl ? ` Profile: ${user.profileUrl}` : ""}`,
          };
        }
        return { text: `Avatar for ${user.name ?? user.id}:\n${user.photoUrl}` };
      } catch (error) {
        return {
          text: `Avatar lookup failed: ${error instanceof Error ? error.message : "unknown error"}`,
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!avatar [userId]"],
    examples: ["!avatar", "!avatar 1234567890"],
    permission: "public",
    cooldownMs: 1000,
  },
);
