# Orchestration

Use this project before approving connector permission changes.

1. Export or draft a before manifest and an after manifest.
2. Run `connector-consent-diff before.json after.json --format markdown`.
3. Review high-risk additions and changed approval requirements.
4. Ask the generated reviewer questions before enabling new capabilities.

Do not run this tool against live credentials. Redact labels if fixtures include customer names.
