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

test("requires a supported array collection with object items", () => {
  assert.throws(
    () => parseManifest({ permissionz: [] }),
    /must contain a capabilities, permissions, or tools array/
  );
  assert.throws(() => parseManifest({ permissions: {} }), /"permissions" must be an array/);
  assert.throws(() => parseManifest({ tools: ["send"] }), /"tools\[0\]" must be an object/);
});

test("preserves permissions and tools evidence paths", () => {
  assert.equal(parseManifest({ permissions: [{ id: "read" }] })[0].evidencePath, "permissions[0]");
  assert.equal(parseManifest({ tools: [{ id: "send" }] })[0].evidencePath, "tools[0]");
});

test("renders both sides and their evidence for changed entries", () => {
  const before = parseManifest({
    permissions: [{ id: "send", category: "messaging", action: "send", target: "draft", approval: "required" }]
  });
  const after = parseManifest({
    tools: [{ id: "send", category: "messaging", action: "send", target: "customer", approval: "required" }]
  });

  const markdown = renderMarkdown(diffCapabilities(before, after));

  assert.match(markdown, /Before: .*target=draft/);
  assert.match(markdown, /Before evidence: permissions\[0\]/);
  assert.match(markdown, /After: .*target=customer/);
  assert.match(markdown, /After evidence: tools\[0\]/);
});
