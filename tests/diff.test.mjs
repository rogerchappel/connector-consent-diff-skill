import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { diffCapabilities, parseManifest, parseManifestFile, renderJson, renderMarkdown } from "../dist/index.js";

test("flags high risk added actions", () => {
  const before = parseManifestFile("fixtures/basic-before.json");
  const after = parseManifestFile("fixtures/risky-after.json");
  const report = diffCapabilities(before, after);
  assert.equal(report.summary.added, 2);
  assert.equal(report.summary.highRisk, 2);
});

test("normalizes only complete explicit category values", () => {
  const capabilities = parseManifest({
    capabilities: [
      { id: "shellfish", category: "shellfish", action: "read", target: "records", approval: "required" },
      { id: "database-proxy", type: "databaseProxy", action: "read", target: "records", approval: "required" },
      { id: "networking", category: "networking", action: "read", target: "records", approval: "required" },
      { id: "shell", category: "SHELL", action: "read", target: "records", approval: "required" },
      { id: "filesystem", type: "file-system", action: "read", target: "records", approval: "required" }
    ]
  });

  assert.deepEqual(capabilities.map(({ category }) => category), ["unknown", "unknown", "unknown", "shell", "filesystem"]);
  const report = diffCapabilities([], capabilities);
  assert.equal(report.summary.highRisk, 1);
  assert.deepEqual(report.entries.map(({ risk }) => risk), ["medium", "medium", "medium", "high", "low"]);
});

test("infers categories from complete delimiter-separated tokens", () => {
  const capabilities = parseManifest({
    capabilities: [
      { id: "shellfish", action: "inspect", target: "shellfish", approval: "required" },
      { id: "database-proxy", action: "inspect", target: "databaseProxy", approval: "required" },
      { id: "networking", action: "inspect", target: "networking", approval: "required" },
      { id: "shell", action: "run", target: "shell-command", approval: "required" },
      { id: "filesystem", action: "read", target: "file_system", approval: "required" }
    ]
  });

  assert.deepEqual(capabilities.map(({ category }) => category), ["unknown", "unknown", "unknown", "shell", "filesystem"]);
});

test("CLI preserves false-positive categories as unknown", () => {
  const directory = mkdtempSync(join(tmpdir(), "connector-consent-diff-"));
  const before = join(directory, "before.json");
  const after = join(directory, "after.json");
  writeFileSync(before, JSON.stringify({ capabilities: [] }));
  writeFileSync(after, JSON.stringify({ capabilities: [
    { id: "probe", category: "shellfish", action: "read", target: "records", approval: "required" }
  ] }));

  const result = spawnSync(process.execPath, ["dist/cli.js", before, after, "--format", "json"], { encoding: "utf8" });
  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.summary.highRisk, 0);
  assert.equal(report.entries[0].after.category, "unknown");
  assert.equal(report.entries[0].risk, "medium");
});

test("matches high-risk action words as complete tokens", () => {
  const falsePositiveResources = ["sender profiles", "runtime settings", "installation guides", "published articles"];
  for (const target of falsePositiveResources) {
    const report = diffCapabilities([], parseManifest({
      capabilities: [{ id: `read-${target}`, category: "network", action: "read", target, approval: "required" }]
    }));
    assert.equal(report.entries[0].risk, "low", target);
  }

  const highRiskActions = ["write", "send", "delete", "update", "create", "publish", "execute", "run", "install", "uninstall"];
  for (const action of highRiskActions) {
    const report = diffCapabilities([], parseManifest({
      capabilities: [{ id: action, category: "network", action, target: "records", approval: "required" }]
    }));
    assert.equal(report.entries[0].risk, "high", action);
  }
});

test("renders reviewer questions", () => {
  const before = parseManifestFile("fixtures/basic-before.json");
  const after = parseManifestFile("fixtures/safe-after.json");
  const md = renderMarkdown(diffCapabilities(before, after));
  assert.match(md, /Reviewer question/);
});

test("keeps manifest-controlled Markdown syntax inside its report fields", () => {
  const after = parseManifest({
    capabilities: [
      {
        id: "normal\n## FORGED SECTION",
        category: "filesystem",
        action: "read\r\n- Risk: low",
        target: "records\nAdded: 999",
        approval: "manual\t# approved"
      }
    ]
  });
  const report = diffCapabilities([], after);
  const markdown = renderMarkdown(report);

  assert.match(markdown, /## ADDED: normal\\n\\#\\# FORGED SECTION/);
  assert.match(markdown, /Action: read\\r\\n\\- Risk: low/);
  assert.match(markdown, /Target: records\\nAdded: 999/);
  assert.match(markdown, /Approval: manual\\t\\# approved/);
  assert.equal(markdown.match(/^## /gm)?.length, 1);
  assert.equal(markdown.match(/^- Risk:/gm)?.length, 1);
  assert.equal(markdown.match(/^Added:/gm)?.length, 1);
  assert.doesNotMatch(markdown, /\r|\t/);

  const json = renderJson(report);
  const parsed = JSON.parse(json);
  assert.equal(parsed.entries[0].id, "normal\n## FORGED SECTION");
  assert.equal(parsed.entries[0].after.action, "read\r\n- Risk: low");
  assert.equal(parsed.entries[0].after.target, "records\nAdded: 999");
  assert.equal(parsed.entries[0].after.approval, "manual\t# approved");
});

test("retains ordinary Markdown report wording", () => {
  const report = diffCapabilities(
    [],
    parseManifest({
      tools: [{ id: "read-config", category: "filesystem", action: "read", target: "config", approval: "required" }]
    })
  );

  assert.equal(
    renderMarkdown(report),
    [
      "# Connector Consent Diff",
      "",
      "Added: 1 | Removed: 0 | Changed: 0 | High risk: 0",
      "",
      "## ADDED: read\\-config",
      "",
      "- Risk: low",
      "- Category: filesystem",
      "- Action: read",
      "- Target: config",
      "- Approval: required",
      "- Evidence: tools\\[0\\]",
      "- Reason: Read\\-like capability with an explicit category and approval statement.",
      "- Reviewer question: Is this scope limited to the smallest useful resource?",
      ""
    ].join("\n")
  );
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

test("requires exactly one supported collection", () => {
  assert.throws(
    () => parseManifest({ capabilities: [], tools: [] }),
    /must contain exactly one of capabilities, permissions, or tools; found conflicting keys: capabilities, tools/
  );
  assert.throws(
    () => parseManifest({ capabilities: [], permissions: [], tools: [] }),
    /found conflicting keys: capabilities, permissions, tools/
  );

  assert.deepEqual(parseManifest({ capabilities: [] }), []);
  assert.deepEqual(parseManifest({ permissions: [] }), []);
  assert.deepEqual(parseManifest({ tools: [] }), []);
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

test("accepts redundant approval aliases with equivalent normalized meanings", () => {
  const required = parseManifest({ capabilities: [{ approval: " required ", approvalRequirement: "YES", requiresApproval: true }] })[0];
  const notRequired = parseManifest({ tools: [{ approval: "not required", approvalRequirement: "never", requiresApproval: false }] })[0];
  assert.equal(required.approval, "required");
  assert.equal(notRequired.approval, "not required");
});

test("rejects conflicting approval aliases with the exact conflicting path", () => {
  assert.throws(
    () => parseManifest({ capabilities: [{ approval: "required", requiresApproval: false }] }),
    /Manifest field "capabilities\[0\]\.requiresApproval" conflicts with approval alias "capabilities\[0\]\.approval"/
  );
  assert.throws(
    () => parseManifest({ permissions: [{ approval: "required", approvalRequirement: "none" }] }),
    { message: 'Manifest field "permissions[0].approvalRequirement" conflicts with approval alias "permissions[0].approval"' }
  );
});

test("CLI rejects conflicting approval aliases without rendering a diff", () => {
  const directory = mkdtempSync(join(tmpdir(), "connector-consent-diff-"));
  const before = join(directory, "before.json");
  const after = join(directory, "after.json");
  const capability = { id: "read", category: "filesystem", action: "read", target: "config" };
  writeFileSync(before, JSON.stringify({ capabilities: [{ ...capability, approval: "required", requiresApproval: true }] }));
  writeFileSync(after, JSON.stringify({ capabilities: [{ ...capability, approval: "required", requiresApproval: false }] }));
  const result = spawnSync(process.execPath, ["dist/cli.js", before, after, "--format", "json"], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /capabilities\[0\]\.requiresApproval/);
  assert.doesNotMatch(result.stderr, /"summary"|Connector Consent Diff/);
});

test("rejects invalid capability aliases with their exact paths", () => {
  const fields = [
    "id", "name", "category", "type", "action", "verb", "operation",
    "target", "resource", "scope", "description"
  ];

  for (const field of fields) {
    for (const value of [17, "", "  \t "]) {
      assert.throws(
        () => parseManifest({ tools: [{ id: "valid" }, { [field]: value }] }),
        new RegExp(`Manifest field "tools\\[1\\]\\.${field}" must be a non-empty string`),
        `${field}: ${JSON.stringify(value)}`
      );
    }
  }
});

test("rejects invalid approval aliases with their exact paths", () => {
  for (const field of ["approval", "approvalRequirement"]) {
    for (const value of [true, 3, {}, [], "  "]) {
      assert.throws(
        () => parseManifest({ permissions: [{ [field]: value }] }),
        new RegExp(`Manifest field "permissions\\[0\\]\\.${field}" must be a non-empty string`)
      );
    }
  }

  for (const value of [3, {}, [], "  "]) {
    assert.throws(
      () => parseManifest({ capabilities: [{ requiresApproval: value }] }),
      /Manifest field "capabilities\[0\]\.requiresApproval" must be a non-empty string or boolean/
    );
  }
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
  assert.match(markdown, /Before evidence: permissions\\\[0\\\]/);
  assert.match(markdown, /After: .*target=customer/);
  assert.match(markdown, /After evidence: tools\\\[0\\\]/);
});
