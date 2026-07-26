import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const cli = path.resolve("dist/cli.js");
const before = "fixtures/basic-before.json";
const after = "fixtures/safe-after.json";

function run(args) {
  return spawnSync(process.execPath, [cli, ...args], { cwd: process.cwd(), encoding: "utf8" });
}

test("supports explicit markdown and JSON formats", () => {
  const markdown = run([before, after, "--format", "markdown"]);
  assert.equal(markdown.status, 0);
  assert.match(markdown.stdout, /^# Connector Consent Diff/);

  const json = run([before, after, "--format", "json"]);
  assert.equal(json.status, 0);
  assert.equal(JSON.parse(json.stdout).summary.highRisk, 0);
});

test("writes output to the requested file", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "connector-consent-diff-"));
  const output = path.join(directory, "report.json");
  try {
    const result = run([before, after, "--format", "json", "--output", output]);
    assert.equal(result.status, 0);
    assert.equal(result.stdout, "");
    assert.equal(JSON.parse(fs.readFileSync(output, "utf8")).summary.highRisk, 0);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

for (const [name, args, message] of [
  ["unsupported format", [before, after, "--format", "yaml"], /--format must be markdown or json/],
  ["missing format", [before, after, "--format"], /--format requires a value/],
  ["missing output", [before, after, "--output"], /--output requires a file path/],
  ["unknown option", [before, after, "--wat"], /Unknown option: --wat/],
  ["extra positional argument", [before, after, "extra.json"], /Unexpected argument: extra\.json/]
]) {
  test(`rejects ${name} with concise usage text`, () => {
    const result = run(args);
    assert.equal(result.status, 1);
    assert.match(result.stderr, message);
    assert.match(result.stderr, /Usage: connector-consent-diff/);
    assert.doesNotMatch(result.stderr, /\n\s+at /);
    assert.equal(result.stdout, "");
  });
}
