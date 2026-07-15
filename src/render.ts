import type { DiffReport } from "./types.js";

export function renderJson(report: DiffReport): string {
  return JSON.stringify(report, null, 2);
}

export function renderMarkdown(report: DiffReport): string {
  const lines = ["# Connector Consent Diff", "", `Added: ${report.summary.added} | Removed: ${report.summary.removed} | Changed: ${report.summary.changed} | High risk: ${report.summary.highRisk}`, ""];
  if (report.entries.length === 0) {
    lines.push("No permission changes detected.");
    return lines.join("\n") + "\n";
  }
  for (const entry of report.entries) {
    const cap = entry.after ?? entry.before;
    lines.push(`## ${entry.kind.toUpperCase()}: ${entry.id}`, "");
    lines.push(`- Risk: ${entry.risk}`);
    lines.push(`- Category: ${cap?.category ?? "unknown"}`);
    lines.push(`- Action: ${cap?.action ?? "unknown"}`);
    lines.push(`- Target: ${cap?.target ?? "unknown"}`);
    lines.push(`- Approval: ${cap?.approval ?? "unknown"}`);
    lines.push(`- Evidence: ${cap?.evidencePath ?? "unknown"}`);
    lines.push(`- Reason: ${entry.reason}`);
    lines.push(`- Reviewer question: ${entry.reviewerQuestion}`, "");
  }
  return lines.join("\n");
}
