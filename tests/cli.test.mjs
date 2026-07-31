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

test("rejects typoed collection keys instead of reporting no changes", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "connector-consent-diff-"));
  const typoed = path.join(directory, "typoed.json");
  try {
    fs.writeFileSync(typoed, JSON.stringify({ permissionz: [{ id: "send" }] }));
    const result = run([typoed, typoed]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /must contain a capabilities, permissions, or tools array/);
    assert.doesNotMatch(result.stdout, /No permission changes detected/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("reports validation errors for invalid collection and item shapes", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "connector-consent-diff-"));
  const invalidCollection = path.join(directory, "collection.json");
  const invalidItem = path.join(directory, "item.json");
  try {
    fs.writeFileSync(invalidCollection, JSON.stringify({ permissions: {} }));
    fs.writeFileSync(invalidItem, JSON.stringify({ tools: [null] }));
    assert.match(run([invalidCollection, after]).stderr, /"permissions" must be an array/);
    assert.match(run([invalidItem, after]).stderr, /"tools\[0\]" must be an object/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("treats reordered duplicate IDs as unchanged while retaining real changes", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "connector-consent-diff-"));
  const reorderedBefore = path.join(directory, "before.json");
  const reorderedAfter = path.join(directory, "after.json");
  try {
    fs.writeFileSync(reorderedBefore, JSON.stringify({ capabilities: [
      { id: "shared", action: "read", target: "alpha" },
      { id: "shared", action: "read", target: "beta" },
      { id: "shared", action: "read", target: "gamma" }
    ] }));
    fs.writeFileSync(reorderedAfter, JSON.stringify({ capabilities: [
      { id: "shared", action: "read", target: "gamma" },
      { id: "shared", action: "read", target: "delta" },
      { id: "shared", action: "read", target: "alpha" }
    ] }));

    const result = run([reorderedBefore, reorderedAfter, "--format", "json"]);
    assert.equal(result.status, 0);
    const report = JSON.parse(result.stdout);
    assert.deepEqual(report.summary, { added: 0, removed: 0, changed: 1, highRisk: 0 });
    assert.equal(report.entries[0].before.evidencePath, "capabilities[1]");
    assert.equal(report.entries[0].after.evidencePath, "capabilities[1]");
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
