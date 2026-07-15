#!/usr/bin/env bash
set -euo pipefail
npm run check
npm test
npm run smoke
node dist/cli.js fixtures/basic-before.json fixtures/risky-after.json --format markdown >/tmp/connector-consent-diff.md || test "$?" -eq 2
npm pack --dry-run >/tmp/connector-consent-diff-pack.txt
