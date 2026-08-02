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

test("ignores a pure reorder within a duplicate-ID group", () => {
  const before = parseManifest({
    capabilities: [
      { id: "shared", action: "read", target: "alpha" },
      { id: "shared", action: "read", target: "beta" }
    ]
  });
  const after = parseManifest({
    capabilities: [
      { id: "shared", action: "read", target: "beta" },
      { id: "shared", action: "read", target: "alpha" }
    ]
  });

  assert.deepEqual(diffCapabilities(before, after).summary, {
    added: 0,
    removed: 0,
    changed: 0,
    highRisk: 0
  });
});

test("pairs the unmatched members of reordered duplicate-ID groups", () => {
  const before = parseManifest({
    permissions: [
      { id: "shared", action: "read", target: "alpha" },
      { id: "shared", action: "read", target: "beta" },
      { id: "shared", action: "read", target: "gamma" }
    ]
  });
  const after = parseManifest({
    tools: [
      { id: "shared", action: "read", target: "gamma" },
      { id: "shared", action: "write", target: "delta" },
      { id: "shared", action: "read", target: "alpha" }
    ]
  });

  const report = diffCapabilities(before, after);

  assert.equal(report.summary.changed, 1);
  assert.equal(report.entries.length, 1);
  assert.equal(report.entries[0].before?.target, "beta");
  assert.equal(report.entries[0].before?.evidencePath, "permissions[1]");
  assert.equal(report.entries[0].after?.target, "delta");
  assert.equal(report.entries[0].after?.evidencePath, "tools[1]");
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

test("normalizes boolean requiresApproval across supported collections", () => {
  for (const collection of ["capabilities", "permissions", "tools"]) {
    const required = parseManifest({ [collection]: [{ requiresApproval: true }] })[0];
    const notRequired = parseManifest({ [collection]: [{ requiresApproval: false }] })[0];

    assert.equal(required.approval, "required");
    assert.equal(notRequired.approval, "not required");
    assert.equal(required.evidencePath, `${collection}[0]`);
    assert.equal(notRequired.evidencePath, `${collection}[0]`);
  }
});

test("retains string approval fields and requiresApproval strings", () => {
  assert.equal(parseManifest({ capabilities: [{ approval: "manual" }] })[0].approval, "manual");
  assert.equal(parseManifest({ permissions: [{ approvalRequirement: "admin" }] })[0].approval, "admin");
  assert.equal(parseManifest({ tools: [{ requiresApproval: "per use" }] })[0].approval, "per use");
});

test("treats boolean approval changes as explicit and diffable", () => {
  const base = { id: "read", category: "filesystem", action: "read", target: "config" };
  const before = parseManifest({ permissions: [{ ...base, requiresApproval: false }] });
  const after = parseManifest({ tools: [{ ...base, requiresApproval: true }] });
  const report = diffCapabilities(before, after);

  assert.equal(report.summary.changed, 1);
  assert.equal(report.entries[0].risk, "low");
  assert.doesNotMatch(report.entries[0].reason, /ambiguous/i);
  assert.equal(report.entries[0].before?.approval, "not required");
  assert.equal(report.entries[0].after?.approval, "required");
});

test("flags approval-gate relaxation while keeping gate tightening low risk", () => {
  const base = { id: "read", category: "filesystem", action: "read", target: "config" };
  const relaxed = diffCapabilities(
    parseManifest({ tools: [{ ...base, requiresApproval: true }] }),
    parseManifest({ tools: [{ ...base, requiresApproval: false }] })
  );
  const tightened = diffCapabilities(
    parseManifest({ tools: [{ ...base, requiresApproval: false }] }),
    parseManifest({ tools: [{ ...base, requiresApproval: true }] })
  );

  assert.equal(relaxed.entries[0].risk, "high");
  assert.match(relaxed.entries[0].reason, /no longer requires explicit approval/i);
  assert.match(relaxed.entries[0].reviewerQuestion, /without the previous approval gate/i);
  assert.equal(relaxed.summary.highRisk, 1);
  assert.equal(tightened.entries[0].risk, "low");
  assert.equal(tightened.summary.highRisk, 0);
});

test("recognizes documented string aliases when approval gates change", () => {
  const base = { id: "read", category: "filesystem", action: "read", target: "config" };
  for (const required of ["required", "true", "yes", "always"]) {
    for (const notRequired of ["not required", "false", "no", "never", "none"]) {
      const relaxed = diffCapabilities(
        parseManifest({ tools: [{ ...base, requiresApproval: required }] }),
        parseManifest({ tools: [{ ...base, requiresApproval: notRequired }] })
      );
      const tightened = diffCapabilities(
        parseManifest({ tools: [{ ...base, requiresApproval: notRequired }] }),
        parseManifest({ tools: [{ ...base, requiresApproval: required }] })
      );
      assert.equal(relaxed.entries[0].risk, "high", `${required} -> ${notRequired}`);
      assert.equal(tightened.entries[0].risk, "low", `${notRequired} -> ${required}`);
    }
  }
});

test("renders normalized boolean approval requirements", () => {
  const after = parseManifest({
    capabilities: [
      { id: "required", category: "filesystem", action: "read", target: "a", requiresApproval: true },
      { id: "unapproved", category: "filesystem", action: "read", target: "b", requiresApproval: false }
    ]
  });

  const markdown = renderMarkdown(diffCapabilities([], after));
  assert.match(markdown, /Approval: required/);
  assert.match(markdown, /Approval: not required/);
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
