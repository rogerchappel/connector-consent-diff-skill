# connector-consent-diff-skill

Use this skill when a user or agent wants to compare connector, plugin, app, or MCP tool permissions before approving a change.

## Required Inputs

- A before manifest or summary.
- An after manifest or summary.
- Optional context about the requester or workflow.

## Side-effect Boundaries

This skill is review-only. Do not approve, connect, install, uninstall, change scopes, or send live messages as part of the diff. If external action is needed, produce a dry-run plan and ask for approval.

## Workflow

1. Confirm both inputs are local files or pasted redacted summaries.
2. Run the CLI in Markdown mode for humans or JSON mode for automation.
3. Highlight high-risk additions, changed approval requirements, and unknown categories.
4. Quote evidence paths so the reviewer can inspect the original manifest.
5. Recommend precise approval wording or a rollback request.

## Validation

Run `npm test`, `npm run check`, and a fixture smoke before trusting a release candidate.
