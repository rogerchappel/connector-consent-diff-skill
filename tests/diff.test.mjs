import assert from "node:assert/strict";
import test from "node:test";
import { diffCapabilities, parseManifest, parseManifestFile, renderMarkdown } from "../dist/index.js";

test("flags high risk added actions", () => {
  const before = parseManifestFile("fixtures/basic-before.json");
  const after = parseManifestFile("fixtures/risky-after.json");
  const report = diffCapabilities(before, after);
  assert.equal(report.summary.added, 2);
  assert.equal(report.summary.highRisk, 2);
});

test("renders reviewer questions", () => {
  const before = parseManifestFile("fixtures/basic-before.json");
  const after = parseManifestFile("fixtures/safe-after.json");
  const md = renderMarkdown(diffCapabilities(before, after));
  assert.match(md, /Reviewer question/);
});

test("compares every capability when derived IDs are duplicated", () => {
  const before = parseManifest({
    capabilities: [
      { action: "read", target: "x", approval: "changed" },
      { action: "read", target: "x", approval: "same" }
    ]
  });
  const after = parseManifest({
    capabilities: [
      { action: "read", target: "x", approval: "new" },
      { action: "read", target: "x", approval: "same" }
    ]
  });

  const report = diffCapabilities(before, after);

  assert.equal(report.summary.changed, 1);
  assert.equal(report.entries.length, 1);
  assert.equal(report.entries[0].before?.evidencePath, "capabilities[0]");
  assert.equal(report.entries[0].after?.evidencePath, "capabilities[0]");
});

test("reports extra duplicate capabilities as additions and removals", () => {
  const capability = { action: "read", target: "x", approval: "same" };
  const one = parseManifest({ capabilities: [capability] });
  const two = parseManifest({ capabilities: [capability, capability] });

  assert.equal(diffCapabilities(one, two).summary.added, 1);
  assert.equal(diffCapabilities(two, one).summary.removed, 1);
});
