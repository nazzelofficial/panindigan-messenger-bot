import { describe, expect, it } from "vitest";
import { panel, bullet, listItem } from "../../src/utils/response.js";

describe("response panel formatter", () => {
  it("renders a clean card with title, rows, and footer — no box drawing", () => {
    const out = panel({
      title: "STATUS",
      tone: "success",
      subtitle: "All systems operational",
      rows: [["Messenger", "connected"], ["Database", "ready"]],
      footer: "!help for commands",
    });
    expect(out).toContain("✅ STATUS");
    expect(out).toContain("Messenger: connected");
    expect(out).toContain("!help for commands");
    // Double-line box glyphs break in Messenger — must never appear.
    expect(out).not.toMatch(/[╔═║╠╚╗╝╣╩╦]/);
    expect(out).toContain("─"); // single rule is safe
  });

  it("renders list items and bullets cleanly", () => {
    expect(bullet("administration", "35")).toBe("▸ administration — 35");
    expect(listItem("🛡️", "administration (35)")).toBe("🛡️ administration (35)");
  });

  it("keeps multi-line output readable on any device", () => {
    const out = panel({
      title: "COMMANDS",
      lines: ["🛡️ administration (35)", "💰 economy (30)", "🤖 ai (15)"],
      footer: "done",
    });
    const lines = out.split("\n");
    expect(lines.length).toBeGreaterThan(4);
    expect(lines.every((l) => l.length < 1900)).toBe(true);
  });
});
