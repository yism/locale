import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildChronologyManifest, chronologyRoot, repoRoot } from "../scripts/chronology-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("chronology latest pointer matches the current protocol version", async () => {
  const latest = (await fs.readFile(path.join(chronologyRoot, "LATEST"), "utf8")).trim();
  const manifest = await buildChronologyManifest();

  assert.equal(latest, manifest.protocol_version);
});

test("chronology manifest matches current tracked artifacts", async () => {
  const manifest = await buildChronologyManifest();
  const storedManifest = JSON.parse(
    await fs.readFile(path.join(chronologyRoot, manifest.protocol_version, "manifest.json"), "utf8")
  );

  assert.deepEqual(storedManifest, manifest);
});

test("chronology tracks only repo-local immutable artifacts", async () => {
  const manifest = await buildChronologyManifest();

  for (const entry of manifest.files) {
    assert.equal(path.isAbsolute(entry.path), false);
    const absolutePath = path.join(repoRoot, entry.path);
    const stat = await fs.stat(absolutePath);
    assert.equal(stat.isFile(), true);
  }
});
