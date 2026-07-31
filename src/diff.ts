import type { Capability, DiffEntry, DiffReport } from "./types.js";
import { classify } from "./risk.js";

function groupById(items: Capability[]): Map<string, Capability[]> {
  const groups = new Map<string, Capability[]>();
  for (const item of items) {
    const group = groups.get(item.id) ?? [];
    group.push(item);
    groups.set(item.id, group);
  }
  return groups;
}

function changed(a: Capability, b: Capability): boolean {
  return a.category !== b.category || a.action !== b.action || a.target !== b.target || a.approval !== b.approval;
}

function removeExactMatches(before: Capability[], after: Capability[]): [Capability[], Capability[]] {
  const unmatchedAfter = [...after];
  const unmatchedBefore = before.filter((beforeCap) => {
    const matchIndex = unmatchedAfter.findIndex((afterCap) => !changed(beforeCap, afterCap));
    if (matchIndex === -1) return true;
    unmatchedAfter.splice(matchIndex, 1);
    return false;
  });
  return [unmatchedBefore, unmatchedAfter];
}

export function diffCapabilities(before: Capability[], after: Capability[]): DiffReport {
  const b = groupById(before);
  const a = groupById(after);
  const entries: DiffEntry[] = [];
  const ids = new Set([...b.keys(), ...a.keys()]);
  for (const id of ids) {
    const [beforeGroup, afterGroup] = removeExactMatches(b.get(id) ?? [], a.get(id) ?? []);
    const sharedLength = Math.min(beforeGroup.length, afterGroup.length);
    for (let index = 0; index < sharedLength; index += 1) {
      const beforeCap = beforeGroup[index];
      const afterCap = afterGroup[index];
      if (changed(beforeCap, afterCap)) {
        entries.push({ kind: "changed", id, before: beforeCap, after: afterCap, ...classify("changed", beforeCap, afterCap) });
      }
    }
    for (const afterCap of afterGroup.slice(sharedLength)) {
      entries.push({ kind: "added", id, after: afterCap, ...classify("added", undefined, afterCap) });
    }
    for (const beforeCap of beforeGroup.slice(sharedLength)) {
      entries.push({ kind: "removed", id, before: beforeCap, ...classify("removed", beforeCap, undefined) });
    }
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
