import { getAgentDir, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerT3Context } from "./context.ts";

export default function (pi: ExtensionAPI) {
  registerT3Context({ pi, agentDir: getAgentDir() });
}
