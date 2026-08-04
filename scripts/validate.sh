#!/usr/bin/env bash
set -euo pipefail
npm run check
npm test
npm run smoke
npm run test:package
node dist/cli.js fixtures/basic-before.json fixtures/risky-after.json --format markdown >/tmp/connector-consent-diff.md || test "$?" -eq 2
if node dist/cli.js fixtures/basic-before.json fixtures/safe-after.json --format yaml >/dev/null 2>&1; then
  echo "unsupported --format unexpectedly succeeded" >&2
  exit 1
fi
if node dist/cli.js fixtures/basic-before.json fixtures/safe-after.json --output >/dev/null 2>&1; then
  echo "missing --output path unexpectedly succeeded" >&2
  exit 1
fi
npm pack --dry-run >/tmp/connector-consent-diff-pack.txt
