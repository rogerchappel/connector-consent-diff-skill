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
    lines.push(`## ${entry.kind.toUpperCase()}: ${entry.id}`, "");
    lines.push(`- Risk: ${entry.risk}`);
    if (entry.kind === "changed") {
      lines.push(`- Before: category=${entry.before?.category ?? "unknown"}, action=${entry.before?.action ?? "unknown"}, target=${entry.before?.target ?? "unknown"}, approval=${entry.before?.approval ?? "unknown"}`);
      lines.push(`- Before evidence: ${entry.before?.evidencePath ?? "unknown"}`);
      lines.push(`- After: category=${entry.after?.category ?? "unknown"}, action=${entry.after?.action ?? "unknown"}, target=${entry.after?.target ?? "unknown"}, approval=${entry.after?.approval ?? "unknown"}`);
      lines.push(`- After evidence: ${entry.after?.evidencePath ?? "unknown"}`);
    } else {
      const cap = entry.after ?? entry.before;
      lines.push(`- Category: ${cap?.category ?? "unknown"}`);
      lines.push(`- Action: ${cap?.action ?? "unknown"}`);
      lines.push(`- Target: ${cap?.target ?? "unknown"}`);
      lines.push(`- Approval: ${cap?.approval ?? "unknown"}`);
      lines.push(`- Evidence: ${cap?.evidencePath ?? "unknown"}`);
    }
    lines.push(`- Reason: ${entry.reason}`);
    lines.push(`- Reviewer question: ${entry.reviewerQuestion}`, "");
  }
  return lines.join("\n");
}
