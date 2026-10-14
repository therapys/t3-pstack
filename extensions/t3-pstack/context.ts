import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = fileURLToPath(new URL("../../plugins/pstack/", import.meta.url));
const marker = "<t3-pstack-pi-context>";
const t3Namespaces = ["mcp__t3-code__", "mcp__t3_code__"];

export function sessionHookOff(sheet: Uint8Array): boolean {
  try {
    const utf16 = sheet[0] === 0xff && sheet[1] === 0xfe;
    const text = new TextDecoder(utf16 ? "utf-16le" : "utf-8", { fatal: true })
      .decode(sheet)
      .replace(/^\uFEFF/, "");
    return text.split("\n").some((line) => line.replace(/\r$/, "") === "session hook: off");
  } catch {
    return false;
  }
}

function readSheetOff(sheetPath: string): boolean {
  try {
    return sessionHookOff(readFileSync(sheetPath));
  } catch {
    return false;
  }
}

export function registerT3Context({ pi, agentDir }: { pi: Pick<ExtensionAPI, "on" | "getAllTools">; agentDir: string }) {
  const sheetPath = join(agentDir, "t3-pstack-models.md");
  pi.on("before_agent_start", (event) => {
    const tools = new Set(pi.getAllTools().map(({ name }) => name));
    const namespace = t3Namespaces.find((prefix) =>
      tools.has(`${prefix}delegate_task`) && tools.has(`${prefix}orchestrator_capabilities`));
    if (!namespace) return;
    const delegateTask = `${namespace}delegate_task`;
    const capabilities = `${namespace}orchestrator_capabilities`;
    if (readSheetOff(sheetPath) || event.systemPrompt.includes(marker)) return;

    const mandate = readFileSync(join(pluginRoot, "hooks/session-start-context.md"), "utf8").trimEnd();
    const context = [
      marker,
      mandate,
      "",
      `This host is Pi inside T3 Code. Use T3's ${delegateTask} for every delegated step. Use ${capabilities} to discover delegation capabilities and available models. Do not use Pi's local subagent or pstack_config tools, and do not spawn local Pi child processes as a fallback.`,
      `Read the role sheet at ${JSON.stringify(sheetPath)} before the first delegation or panel. Pi's agent directory is ${JSON.stringify(agentDir)}. Do not use the Claude or Codex config directories for this host.`,
      `The absolute plugin root is ${JSON.stringify(pluginRoot)}. Read the poteto-mode skill at ${JSON.stringify(join(pluginRoot, "skills/poteto-mode/SKILL.md"))}. Resolve bundled skill paths beneath ${JSON.stringify(join(pluginRoot, "skills"))} and persona briefs beneath ${JSON.stringify(join(pluginRoot, "agents"))}.`,
      "Pi skills can be opened by their absolute SKILL.md paths. The t3-pstack: skill names in the mandate refer to these bundled skills.",
      "</t3-pstack-pi-context>",
    ].join("\n");
    return { systemPrompt: `${event.systemPrompt}\n\n${context}` };
  });
}
