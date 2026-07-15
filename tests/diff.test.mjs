import assert from "node:assert/strict";
import test from "node:test";
import { diffCapabilities, parseManifestFile, renderMarkdown } from "../dist/index.js";

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
