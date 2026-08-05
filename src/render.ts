import type { DiffReport } from "./types.js";

const markdownSyntax = new Set(["\\", "`", "*", "_", "{", "}", "[", "]", "<", ">", "(", ")", "#", "+", "-", "!", "|"]);

function escapeMarkdownField(value: string): string {
  let escaped = "";
  for (const character of value) {
    if (character === "\n") escaped += "\\n";
    else if (character === "\r") escaped += "\\r";
    else if (character === "\t") escaped += "\\t";
    else if (character === "\b") escaped += "\\b";
    else if (character === "\f") escaped += "\\f";
    else if (character === "\v") escaped += "\\v";
    else if (character === "\u2028") escaped += "\\u2028";
    else if (character === "\u2029") escaped += "\\u2029";
    else {
      const codePoint = character.codePointAt(0) ?? 0;
      if (codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f)) {
        escaped += `\\u${codePoint.toString(16).padStart(4, "0")}`;
      } else {
        escaped += markdownSyntax.has(character) ? `\\${character}` : character;
      }
    }
  }
  return escaped;
}

function field(value: string | undefined): string {
  return escapeMarkdownField(value ?? "unknown");
}

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
    lines.push(`## ${entry.kind.toUpperCase()}: ${field(entry.id)}`, "");
    lines.push(`- Risk: ${entry.risk}`);
    if (entry.kind === "changed") {
      lines.push(`- Before: category=${field(entry.before?.category)}, action=${field(entry.before?.action)}, target=${field(entry.before?.target)}, approval=${field(entry.before?.approval)}`);
      lines.push(`- Before evidence: ${field(entry.before?.evidencePath)}`);
      lines.push(`- After: category=${field(entry.after?.category)}, action=${field(entry.after?.action)}, target=${field(entry.after?.target)}, approval=${field(entry.after?.approval)}`);
      lines.push(`- After evidence: ${field(entry.after?.evidencePath)}`);
    } else {
      const cap = entry.after ?? entry.before;
      lines.push(`- Category: ${field(cap?.category)}`);
      lines.push(`- Action: ${field(cap?.action)}`);
      lines.push(`- Target: ${field(cap?.target)}`);
      lines.push(`- Approval: ${field(cap?.approval)}`);
      lines.push(`- Evidence: ${field(cap?.evidencePath)}`);
    }
    lines.push(`- Reason: ${field(entry.reason)}`);
    lines.push(`- Reviewer question: ${field(entry.reviewerQuestion)}`, "");
  }
  return lines.join("\n");
}
