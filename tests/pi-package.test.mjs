import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { registerT3Context, sessionHookOff } from "../extensions/t3-pstack/context.ts";
import { sheetCases, writeSheet } from "./session-hook-sheets.mjs";

const pluginRoot = fileURLToPath(new URL("../plugins/pstack/", import.meta.url));
const mandate = readFileSync(join(pluginRoot, "hooks/session-start-context.md"), "utf8").trimEnd();
const t3Tools = ["mcp__t3-code__delegate_task", "mcp__t3-code__orchestrator_capabilities"];
const canonicalTools = ["mcp__t3_code__delegate_task", "mcp__t3_code__orchestrator_capabilities"];

function withExtension(run) {
  const agentDir = mkdtempSync(join(tmpdir(), "t3-pstack-pi-"));
  let handler;
  let toolNames = [...t3Tools];
  const registrations = [];
  const pi = {
    on(event, callback) {
      registrations.push(event);
      handler = callback;
      return () => {};
    },
    getAllTools: () => toolNames.map((name) => ({ name })),
  };
  registerT3Context({ pi, agentDir });
  try {
    return run({
      agentDir,
      registrations,
      setTools: (names) => { toolNames = names; },
      start: (systemPrompt = "Original system prompt") => handler({ systemPrompt }),
    });
  } finally {
    rmSync(agentDir, { recursive: true, force: true });
  }
}

describe("Pi package manifest", () => {
  test("declares the T3 context extension and bundled skills for Pi discovery", () => {
    const root = fileURLToPath(new URL("../", import.meta.url));
    const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    expect(Array.isArray(manifest.pi?.extensions)).toBe(true);
    expect(Array.isArray(manifest.pi?.skills)).toBe(true);
    const extensions = manifest.pi.extensions.map((path) => resolve(root, path));
    expect(extensions.some((path) =>
      path === join(root, "extensions/t3-pstack") ||
      path === join(root, "extensions/t3-pstack/index.ts"))).toBe(true);
    expect(manifest.pi.skills.map((path) => resolve(root, path)))
      .toContain(join(root, "plugins/pstack/skills"));
  });
});

describe("Pi inside T3 session context", () => {
  test("registers only the prompt hook and injects the shipped mandate with absolute Pi paths", () => {
    withExtension(({ agentDir, registrations, start }) => {
      expect(registrations).toEqual(["before_agent_start"]);
      const { systemPrompt } = start();
      expect(systemPrompt.startsWith("Original system prompt\n\n")).toBe(true);
      expect(systemPrompt).toContain(mandate);
      expect(systemPrompt).toContain(JSON.stringify(join(agentDir, "t3-pstack-models.md")));
      expect(systemPrompt).toContain(JSON.stringify(join(pluginRoot, "skills/poteto-mode/SKILL.md")));
      expect(systemPrompt).toContain(JSON.stringify(join(pluginRoot, "agents")));
      expect(systemPrompt).toContain(`Use T3's ${t3Tools[0]}`);
      expect(systemPrompt).toContain(`Use ${t3Tools[1]} to discover`);
      expect(systemPrompt).toContain("Do not use Pi's local subagent or pstack_config tools");
      expect(systemPrompt).toContain("do not spawn local Pi child processes as a fallback");
    });
  });

  for (const names of [
    [],
    ["subagent", "pstack_config"],
    ["delegate_task"],
    ["orchestrator_capabilities"],
    ["delegate_task", "orchestrator_capabilities"],
    [t3Tools[0]],
    [t3Tools[1]],
    [t3Tools[0], canonicalTools[1]],
    [canonicalTools[0], t3Tools[1]],
    [t3Tools[0], "orchestrator_capabilities"],
    ["mcp__other__delegate_task", "mcp__other__orchestrator_capabilities"],
    ["mcp__t3__delegate_task", "orchestrator_capabilities"],
  ]) {
    test(`does not inject outside T3 with ${JSON.stringify(names)}`, () => {
      withExtension(({ setTools, start }) => {
        setTools(names);
        expect(start()).toBeUndefined();
      });
    });
  }

  for (const names of [t3Tools, canonicalTools]) {
    test(`dispatches through a complete T3 namespace ${names[0]}`, () => {
      withExtension(({ setTools, start }) => {
        setTools(names);
        const { systemPrompt } = start();
        expect(systemPrompt).toContain(`Use T3's ${names[0]} for every delegated step`);
        expect(systemPrompt).toContain(`Use ${names[1]} to discover`);
      });
    });
  }

  test("prefers public tools when hidden canonical aliases are also registered", () => {
    withExtension(({ setTools, start }) => {
      setTools([...canonicalTools, ...t3Tools]);
      const { systemPrompt } = start();
      expect(systemPrompt).toContain(`Use T3's ${t3Tools[0]}`);
      expect(systemPrompt).toContain(`Use ${t3Tools[1]} to discover`);
      expect(systemPrompt).not.toContain(canonicalTools[0]);
      expect(systemPrompt).not.toContain(canonicalTools[1]);
    });
  });

  test("detects tools at run time rather than extension load time", () => {
    withExtension(({ setTools, start }) => {
      setTools([]);
      expect(start()).toBeUndefined();
      setTools(t3Tools);
      expect(start().systemPrompt).toContain(mandate);
    });
  });

  test("each fresh run gets the mandate, while an already augmented prompt is unchanged", () => {
    withExtension(({ start }) => {
      const first = start().systemPrompt;
      expect(start().systemPrompt).toBe(first);
      expect(start(first)).toBeUndefined();
      expect(first.split(mandate)).toHaveLength(2);
      expect(start("Resumed base prompt").systemPrompt).toContain(mandate);
    });
  });

  for (const { name, sheet, off } of sheetCases) {
    test(`honors shared sheet grammar for ${name}`, () => {
      withExtension(({ agentDir, start }) => {
        writeSheet(join(agentDir, "t3-pstack-models.md"), sheet);
        if (off) expect(start()).toBeUndefined();
        else expect(start().systemPrompt).toContain(mandate);
      });
    });
  }

  test("rereads the agent sheet when the off switch changes", () => {
    withExtension(({ agentDir, start }) => {
      const path = join(agentDir, "t3-pstack-models.md");
      expect(start().systemPrompt).toContain(mandate);
      writeFileSync(path, "session hook: off\n");
      expect(start()).toBeUndefined();
      writeFileSync(path, "session hook: on\n");
      expect(start().systemPrompt).toContain(mandate);
    });
  });

  test("undecodable sheets leave the mandate enabled", () => {
    expect(sessionHookOff(Buffer.from([0xff, 0xfe, 0x73]))).toBe(false);
    expect(sessionHookOff(Buffer.from([0xff, 0x80]))).toBe(false);
  });
});
