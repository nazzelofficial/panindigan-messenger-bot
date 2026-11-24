import { describe, expect, it } from "vitest";
import { panel, bullet } from "../../src/utils/response.js";

describe("response panel formatter", () => {
  it("draws an aligned box panel with title, rows, and footer", () => {
    const out = panel({
      title: "STATUS",
      tone: "success",
      subtitle: "All systems operational",
      rows: [["Messenger", "connected"], ["Database", "ready"]],
      footer: "!help for commands",
    });
    expect(out).toContain("╔");
    expect(out).toContain("╚");
    expect(out).toContain("✓ STATUS");
    expect(out).toContain("Messenger");
    expect(out).toContain("connected");
    // All lines have equal visible width (box is aligned).
    const lines = out.split("\n");
    const widths = lines.map((l) => [...l].length);
    expect(new Set(widths).size).toBe(1);
  });

  it("auto-widens for a long subtitle instead of spilling past the border", () => {
    // 40 chars — beyond the 34 default, within the 46 cap.
    const subtitle = "A subtitle that is forty chars long ok";
    expect([...subtitle].length).toBe(38);
    const out = panel({ title: "INFO", subtitle });
    const lines = out.split("\n");
    const widths = lines.map((l) => [...l].length);
    expect(new Set(widths).size).toBe(1);
    expect(out).toContain(subtitle);
  });

  it("truncates content beyond the max width so it never spills", () => {
    const out = panel({ title: "INFO", subtitle: "x".repeat(120) });
    const lines = out.split("\n");
    const widths = lines.map((l) => [...l].length);
    expect(new Set(widths).size).toBe(1);
    expect(out).toContain("…");
  });

  it("bullet formats a label and value", () => {
    expect(bullet("administration", "35 cmds")).toContain("administration");
    expect(bullet("administration", "35 cmds")).toContain("35 cmds");
  });
});
