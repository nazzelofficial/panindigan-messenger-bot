import { fetchJson } from "../../../utils/http.js";
import { createCommand, type CommandContext, type CommandResult } from "../../types.js";

interface DictionaryDefinition {
  readonly definition?: string;
  readonly example?: string;
}

interface DictionaryMeaning {
  readonly partOfSpeech?: string;
  readonly definitions?: readonly DictionaryDefinition[];
}

interface DictionaryEntry {
  readonly word?: string;
  readonly phonetic?: string;
  readonly meanings?: readonly DictionaryMeaning[];
}

export default createCommand(
  {
    name: "define",
    description: "Look up an English word definition using the free DictionaryAPI service.",
    category: "information",
    async run(context: CommandContext): Promise<CommandResult> {
      const word = context.args.positional[0];
      if (!word) return { text: "Give me a word to look up, for example: !define resilient" };
      if (!/^[A-Za-z][A-Za-z'-]{0,39}$/.test(word))
        return {
          text: "Only single alphabetic words (optionally with hyphens or apostrophes) are accepted.",
        };
      try {
        const entries = await fetchJson<readonly DictionaryEntry[]>(
          `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`,
        );
        const entry = Array.isArray(entries) ? entries[0] : undefined;
        if (!entry) return { text: `No dictionary entry was found for "${word}".` };
        const lines = [`Word: ${entry.word ?? word}`];
        if (entry.phonetic) lines.push(`Pronunciation: ${entry.phonetic}`);
        let shown = 0;
        for (const meaning of entry.meanings ?? []) {
          if (shown >= 4) break;
          for (const definition of meaning.definitions ?? []) {
            if (shown >= 4) break;
            if (typeof definition.definition !== "string") continue;
            const part = meaning.partOfSpeech ? ` (${meaning.partOfSpeech})` : "";
            lines.push(`${shown + 1}. ${definition.definition}${part}`);
            if (definition.example) lines.push(`   e.g. ${definition.example}`);
            shown += 1;
          }
        }
        if (shown === 0) lines.push("The entry contained no readable definitions.");
        return { text: lines.join("\n") };
      } catch (error) {
        return {
          text: `Dictionary lookup failed: ${error instanceof Error ? error.message : "unknown error"}`,
        };
      }
    },
  },
  {
    aliases: [],
    usage: ["!define WORD"],
    examples: ["!define resilient", "!define photosynthesis"],
    permission: "public",
    cooldownMs: 1000,
  },
);
