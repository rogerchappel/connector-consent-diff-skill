import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const consumer = mkdtempSync(join(tmpdir(), "connector-consent-diff-consumer-"));

try {
  const packOutput = execFileSync("npm", ["pack", "--json", "--pack-destination", consumer], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  const [{ filename }] = JSON.parse(packOutput);

  writeFileSync(join(consumer, "package.json"), '{"private":true,"type":"module"}\n');
  execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", `./${filename}`], {
    cwd: consumer,
    stdio: "pipe",
  });

  const manifestPath = join(consumer, "manifest.json");
  writeFileSync(manifestPath, '{"capabilities":[{"id":"files.read","description":"Read files"}]}\n');
  writeFileSync(
    join(consumer, "verify.mjs"),
    `import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  diffCapabilities,
  parseManifest,
  parseManifestFile,
  renderJson,
  renderMarkdown,
} from "connector-consent-diff-skill";

const parsed = parseManifest(JSON.parse(readFileSync("manifest.json", "utf8")));
assert.deepEqual(parseManifestFile("manifest.json"), parsed);
const report = diffCapabilities([], parsed);
assert.doesNotThrow(() => JSON.parse(renderJson(report)));
assert.match(renderMarkdown(report), /files\\.read/);
console.log("Packed package root import passed for all documented exports");
`,
  );
  execFileSync(process.execPath, ["verify.mjs"], { cwd: consumer, stdio: "inherit" });
} finally {
  rmSync(consumer, { recursive: true, force: true });
}
