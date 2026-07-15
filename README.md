# connector-consent-diff-skill

Local-first CLI and agent skill for comparing connector or tool permission plans before a human approves them.

## Quickstart

```bash
npm install
npm run build
npx connector-consent-diff fixtures/basic-before.json fixtures/risky-after.json --format markdown
```

## What it does

- Parses JSON connector manifests and OpenClaw-style tool summaries.
- Finds added, removed, and changed read/write/action capabilities.
- Classifies risk across filesystem, network, messaging, browser, shell, database, secrets, and unknown categories.
- Emits Markdown or JSON evidence with approval wording and reviewer questions.

## Safety

The CLI only reads local fixture files and writes to stdout unless `--output` is supplied. It never calls connector APIs, reads credential values, changes permissions, or approves external actions.

## Limitations

V1 uses deterministic keyword classification. Treat unknown categories as review prompts, not authoritative security findings.

## Verification

Run the local gates before opening a pull request:

```sh
npm test
npm run check
npm run smoke
```

