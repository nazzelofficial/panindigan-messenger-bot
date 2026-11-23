import { truncate } from "../../../utils/text.js";
import { fetchJson } from "../../../utils/http.js";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

interface WikipediaSummary {
  readonly title?: string;
  readonly extract?: string;
  readonly description?: string;
  readonly content_urls?: { readonly desktop?: { readonly page?: string } };
}

export default createCommand(
  {
    name: "wikipedia",
    description: "Retrieve a plain-language summary from English Wikipedia's REST API.",
    category: "information",
    async run(context: CommandContext): Promise<CommandResult> {
      const topic = context.args.positional.join(" ").trim();
      if (!topic) return { text: "Give me a topic, for example: !wikipedia Manila" };
      if (topic.length > 120)
        return { text: "That topic is too long for a Wikipedia summary lookup." };
      try {
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic.replace(/\s+/g, "_"))}`;
        const data = await fetchJson<WikipediaSummary>(url);
        if (typeof data.extract !== "string" || data.extract.length === 0) {
          return { text: `No summary is available for "${topic}".` };
        }
        const link = data.content_urls?.desktop?.page;
        return {
          text: [
            `Wikipedia: ${data.title ?? topic}`,
            data.description ? `Description: ${data.description}` : undefined,
            "",
            truncate(data.extract, 1200),
            link ? `\nRead more: ${link}` : undefined,
          ]
            .filter((line): line is string => line !== undefined)
            .join("\n"),
        };
      } catch (error) {
        return {
          text: `Wikipedia lookup failed: ${error instanceof Error ? error.message : "unknown error"}`,
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!wikipedia TOPIC"],
    examples: ["!wikipedia Manila", "!wikipedia Philippine cuisine"],
    permission: "public",
    cooldownMs: 1000,
  },
);
