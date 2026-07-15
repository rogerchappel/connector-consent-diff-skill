# PRD: connector-consent-diff-skill

Status: in-progress
Decision: ship
Updated: 2026-07-15
Source: OSS Factory queue replenishment after ready contained only empty placeholders.

## Summary

`connector-consent-diff-skill` compares two connector/tool permission plans and produces a reviewer-friendly diff of newly requested reads, writes, external actions, and approval requirements.

## Problem

Agents often ask to connect or update tools without a compact explanation of what changed. Humans need a dry-run consent diff before approving broader connector access or live external writes.

## Users

- Agent operators reviewing MCP/OpenClaw connector changes.
- Maintainers packaging connector demos or dry-run action plans.
- Project managers who need an auditable approval note before enabling integrations.

## V1 Scope

- CLI: `connector-consent-diff before.json after.json --format markdown`.
- Parse simple JSON/YAML connector manifests and OpenClaw-style tool summaries.
- Classify added, removed, and changed capabilities across filesystem, network, messaging, browser, shell, database, and secrets categories.
- Emit Markdown and JSON reports with risk level, evidence path, approval wording, and suggested reviewer questions.
- Include an agent `SKILL.md` covering when to use it, required inputs, side-effect boundaries, and verification.
- Provide fixtures for safe, risky, and ambiguous connector changes.

## Out of Scope

- Enforcing runtime permissions.
- Reading credential values.
- Calling connector APIs.
- Merging or approving connector changes automatically.

## Verification

- Unit tests for manifest parsing, diff classification, and report rendering.
- CLI smoke against local fixtures.
- `npm test`, `npm run check`, `npm run build`, `npm run smoke`, and package dry-run.

## Agent Prompt

Build `connector-consent-diff-skill` as a local-first consent-diff CLI and reusable agent skill for reviewing connector/tool permission changes before approval.
