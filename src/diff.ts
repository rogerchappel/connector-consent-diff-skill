import type { Capability, DiffEntry, DiffReport } from "./types.js";
import { classify } from "./risk.js";

function mapById(items: Capability[]): Map<string, Capability> {
  return new Map(items.map((item) => [item.id, item]));
}

function changed(a: Capability, b: Capability): boolean {
  return a.category !== b.category || a.action !== b.action || a.target !== b.target || a.approval !== b.approval;
}

export function diffCapabilities(before: Capability[], after: Capability[]): DiffReport {
  const b = mapById(before);
  const a = mapById(after);
  const entries: DiffEntry[] = [];
  for (const [id, afterCap] of a) {
    const beforeCap = b.get(id);
    if (!beforeCap) entries.push({ kind: "added", id, after: afterCap, ...classify("added", undefined, afterCap) });
    else if (changed(beforeCap, afterCap)) entries.push({ kind: "changed", id, before: beforeCap, after: afterCap, ...classify("changed", beforeCap, afterCap) });
  }
  for (const [id, beforeCap] of b) {
    if (!a.has(id)) entries.push({ kind: "removed", id, before: beforeCap, ...classify("removed", beforeCap, undefined) });
  }
  return {
    summary: {
      added: entries.filter((entry) => entry.kind === "added").length,
      removed: entries.filter((entry) => entry.kind === "removed").length,
      changed: entries.filter((entry) => entry.kind === "changed").length,
      highRisk: entries.filter((entry) => entry.risk === "high").length
    },
    entries
  };
}
