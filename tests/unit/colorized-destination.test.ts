import { describe, expect, it } from "vitest";
import { renderLogLine } from "../../src/logging/colorized-destination.js";

describe("colorized console logs", () => {
  it("renders a pino JSON line as a colored, non-JSON line", () => {
    const line = JSON.stringify({
      level: 30,
      time: "2026-11-24T12:11:41.000Z",
      library: "panindigan-messenger-bot",
      module: "dispatcher",
      msg: "Command executed",
      command: "help",
    });
    const out = renderLogLine(line);
    expect(out).not.toContain("{");
    expect(out).not.toContain('"level"');
    expect(out).toContain("INFO");
    expect(out).toContain("◆"); // bot brand mark
    expect(out).toContain("⟦DISPATCHER⟧"); // corner-bracketed module
    expect(out).toContain("Command executed");
    expect(out).toMatch(/\[\d{2}:\d{2}:\d{2}\.\d{3}\]/); // bracketed time with ms
    expect(out).toContain("\x1b[48;5;35m"); // green pill background for INFO
    expect(out).toContain("\x1b["); // ANSI colors present
  });

  it("uses the right badge for warn/error and renders stack traces", () => {
    const warn = renderLogLine(JSON.stringify({ level: 40, time: Date.now(), msg: "Slow down", delayMs: 2000 }));
    expect(warn).toContain("WARN");
    const err = renderLogLine(JSON.stringify({
      level: 50, time: Date.now(), msg: "Failed",
      err: { message: "boom", stack: "Error: boom\n  at x" },
    }));
    expect(err).toContain("ERROR");
    expect(err).toContain("  at x");
  });

  it("redaction censor from pino is preserved in the rendered line", () => {
    const line = JSON.stringify({ level: 30, time: Date.now(), msg: "cfg", cookie: "[REDACTED]" });
    expect(renderLogLine(line)).toContain("[REDACTED]");
  });
});
