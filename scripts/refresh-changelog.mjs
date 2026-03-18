import fs from "node:fs/promises";
import path from "node:path";
import { chronologyRoot } from "./chronology-lib.mjs";

export async function refreshChangelog() {
  const latestVersion = (await fs.readFile(path.join(chronologyRoot, "LATEST"), "utf8")).trim();
  const manifest = JSON.parse(
    await fs.readFile(path.join(chronologyRoot, latestVersion, "manifest.json"), "utf8")
  );

  const changelog = `# Changelog

## ${manifest.protocol_version}

### Release summary

- Positioning: MCP-native capability and policy authority
- Boundary: evaluate-only agent preflight with offline verification and attestation
- Hardening sources: host profiles, transcripts, chronology, and compatibility tests

- Protocol version: \`${manifest.protocol_version}\`
- MCP tools: ${manifest.authority_surface.mcp_tools.map((tool) => `\`${tool}\``).join(", ")}
- Token formats: ${manifest.authority_surface.token_format.map((format) => `\`${format}\``).join(", ")}
- Policy packs: ${manifest.authority_surface.policy_packs.map((pack) => `\`${pack}\``).join(", ")}
- Chronology manifest: [docs/chronology/${manifest.protocol_version}/manifest.json](./chronology/${manifest.protocol_version}/manifest.json)

### Artifact coverage

${manifest.files.map((entry) => `- \`${entry.path}\``).join("\n")}
`;

  await fs.writeFile(path.join(path.dirname(chronologyRoot), "changelog.md"), `${changelog}\n`);
}

await refreshChangelog();
