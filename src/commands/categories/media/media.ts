import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

export default createCommand(
  {
    name: "media",
    description:
      "Show which media commands are supported and which capabilities need extra providers.",
    category: "media",
    async run(context: CommandContext): Promise<CommandResult> {
      const enabled = context.config.modules.media ? "enabled" : "disabled";
      return {
        text:
          `🖼️ Media module: ${enabled}\n\n` +
          "Music catalog (iTunes Search API): !play, !lyrics, !lyricssearch, !musicinfo, !artist, !album, !track, !searchmusic, !youtube.\n" +
          "Image transforms (images.weserv.nl URLs): !thumbnail, !resize, !crop, !blur, !enhance, !compress.\n" +
          "Messenger uploads (direct http(s) URLs with size limits): !download, !video, !audio, !voice, !toimage, !unsticker, !sticker.\n" +
          "Not available in this build: !totext needs an OCR provider and !screenshot needs a headless-browser provider; both explain what to configure instead of faking a result.\n" +
          "Use the command name with no arguments to see its own usage.",
      };
    },
  },
  {
    aliases: [],
    usage: ["!media"],
    examples: ["!media"],
    permission: "public",
    cooldownMs: 2000,
  },
);
