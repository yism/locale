#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const codexHome = process.env.CODEX_HOME || path.join(process.env.HOME || "", ".codex");

async function listDir(sourceDir) {
  try {
    return await fs.readdir(sourceDir, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function syncFolder(sourceDir, targetDir) {
  await fs.mkdir(targetDir, { recursive: true });
  const entries = await listDir(sourceDir);
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const source = path.join(sourceDir, entry.name);
    const target = path.join(targetDir, entry.name);
    await fs.mkdir(target, { recursive: true });
    const children = await fs.readdir(source);
    for (const child of children) {
      await fs.cp(path.join(source, child), path.join(target, child), {
        recursive: true,
        force: true
      });
    }
    console.log(`synced ${source} -> ${target}`);
  }
}

await syncFolder(path.join(repoRoot, "codex-skills"), path.join(codexHome, "skills"));
await syncFolder(path.join(repoRoot, "codex-automations"), path.join(codexHome, "automations"));
