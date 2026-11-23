import { createCommand, type CommandContext, type CommandResult } from "../../types.js";
import { extractUserIdFromUrl } from "panindigan-automate";

export default createCommand(
  {
    name: "addmember",
    description: "Add a user to this group from a profile link or numeric ID.",
    category: "administration",
    async run(context: CommandContext): Promise<CommandResult> {
      const input = context.args.positional[0];
      if (!input) return { text: "Usage: !addmember <Facebook profile URL or numeric user ID>." };
      const directId = /^\d{4,25}$/.test(input) ? input : extractUserIdFromUrl(input);
      if (!directId)
        return {
          text: "That link could not be resolved to a Facebook account. Provide a full profile URL or a numeric user ID.",
        };
      const thread = await context.messenger.getThread(context.threadId);
      const botId = context.messenger.currentUserId;
      const callerIsGroupAdmin = thread?.adminIDs?.includes(context.senderId) ?? false;
      const botIsGroupAdmin = thread?.adminIDs?.includes(botId) ?? false;
      if (!context.services.permissions.isAdmin(context.senderId) && !callerIsGroupAdmin)
        return { text: "You need administrator permission in this group to add members." };
      if (botIsGroupAdmin === false)
        return {
          text: "The bot account is not an administrator of this group and cannot add members here.",
        };
      if (thread?.participantIds?.includes(directId))
        return { text: "That account is already a member of this group." };
      const confirmationKey = "addmember:confirm:" + context.senderId;
      const pending = await context.services.cache.get(confirmationKey);
      if (pending !== directId) {
        await context.services.cache.set(confirmationKey, directId, 120);
        return {
          text:
            "Resolved profile to account " +
            directId +
            ". Confirm by repeating the same command within 2 minutes.",
        };
      }
      await context.services.cache.delete(confirmationKey);
      try {
        const resolved = await context.messenger.resolveProfileId(input);
        if (resolved !== directId)
          return {
            text:
              "The resolved account (" +
              resolved +
              ") does not match the intended account (" +
              directId +
              "). Nothing was changed.",
          };
        await context.messenger.addParticipant(context.threadId, resolved);
        await context.services.moderation.recordAction(
          undefined,
          "add_member",
          resolved,
          context.senderId,
          "Added via profile link",
        );
        return {
          text: "✅ Account " + resolved + " was added to the group (confirmed by Messenger).",
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown error";
        return {
          text:
            "Messenger did not confirm the addition: " +
            message +
            " Check permissions, restrictions and rate limits. No success is claimed.",
        };
      }
    },
  },
  {
    aliases: ["add", "invite"],
    usage: ["!addmember <profile-url|userId>"],
    examples: ["!addmember https://www.facebook.com/juan.dela.cruz", "!invite 123456789"],
    permission: "admin",
    cooldownMs: 3000,
    maintenanceSafe: false,
  },
);
