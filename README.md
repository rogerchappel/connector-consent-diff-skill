# connector-consent-diff-skill

Local-first CLI and agent skill for comparing connector or tool permission plans before a human approves them.

## Quickstart

```bash
npm install
npm run build
npx connector-consent-diff fixtures/basic-before.json fixtures/risky-after.json --format markdown
```

`--format` accepts `markdown` (the default) or `json`. Use `--output <file>` to
write the report instead of printing it:

```bash
npx connector-consent-diff fixtures/basic-before.json fixtures/safe-after.json \
  --format json --output consent-diff.json
```

## Programmatic API

The package root provides the supported ESM API, with TypeScript declarations:

```js
import {
  diffCapabilities,
  parseManifest,
  parseManifestFile,
  renderJson,
  renderMarkdown,
} from "connector-consent-diff-skill";

const before = parseManifestFile("before.json");
const after = parseManifest({ capabilities: [{ id: "files.read" }] });
const report = diffCapabilities(before, after);

console.log(renderMarkdown(report));
console.log(renderJson(report));
```

## What it does

- Parses JSON connector manifests and OpenClaw-style tool summaries.
- Finds added, removed, and changed read/write/action capabilities.
- Classifies risk across filesystem, network, messaging, browser, shell, database, secrets, and unknown categories.
- Matches high-risk write and execution actions as complete, case-insensitive tokens, so resource names such as `sender profiles` do not trigger on the `send` substring.
- Emits Markdown or JSON evidence with approval wording and reviewer questions.
- Preserves repeated capability IDs and compares repeated entries in manifest order.
- Treats relaxing an explicit approval gate as high risk while leaving gate tightening low risk. Boolean values and the case-insensitive strings `required`, `true`, `yes`, and `always` mean approval is required; `not required`, `false`, `no`, `never`, and `none` mean it is not required. Other approval wording is not interpreted directionally.

## Safety

The CLI only reads local fixture files and writes to stdout unless `--output` is supplied. It never calls connector APIs, reads credential values, changes permissions, or approves external actions.

Input must contain exactly one `capabilities`, `permissions`, or `tools` array
of objects. These keys are mutually exclusive; manifests containing multiple
supported collections are rejected with a diagnostic naming the conflicts.
Invalid collection keys and shapes are also reported as validation errors.
Present identity, category, action, and target aliases must be non-empty strings;
blank, whitespace-only, and non-string values are rejected rather than replaced
by defaults. Validation errors exit with status 1 and no diff output; see
[the input format guide](docs/INPUT_FORMAT.md).
Reports containing any high-risk change are still emitted and exit with status
2; reports without high-risk changes exit with status 0.

## Limitations

V1 uses deterministic keyword classification. Treat unknown categories as review prompts, not authoritative security findings.

## Verification

Run the local gates before opening a pull request:

```sh
npm test
npm run check
npm run smoke
npm run test:package
```
