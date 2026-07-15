import fs from "node:fs";
import type { Capability, CapabilityCategory } from "./types.js";

const categories: CapabilityCategory[] = ["filesystem", "network", "messaging", "browser", "shell", "database", "secrets"];

function categoryFor(value: string): CapabilityCategory {
  const text = value.toLowerCase();
  return categories.find((category) => text.includes(category)) ?? "unknown";
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>);
  return [];
}

function getString(record: Record<string, unknown>, names: string[], fallback = ""): string {
  for (const name of names) {
    const value = record[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallback;
}

export function parseManifestFile(file: string): Capability[] {
  const raw = fs.readFileSync(file, "utf8");
  const data = JSON.parse(raw) as Record<string, unknown>;
  return parseManifest(data);
}

export function parseManifest(data: Record<string, unknown>): Capability[] {
  const source = data.capabilities ?? data.permissions ?? data.tools ?? [];
  return asArray(source).map((item, index) => {
    const record = typeof item === "object" && item ? item as Record<string, unknown> : { value: String(item) };
    const action = getString(record, ["action", "verb", "operation", "name"], "use");
    const target = getString(record, ["target", "resource", "scope", "description"], getString(record, ["value"], "unspecified"));
    const category = getString(record, ["category", "type"], "");
    const id = getString(record, ["id", "name"], `${category || categoryFor(action + " " + target)}:${action}:${target}`);
    return {
      id,
      category: (category ? categoryFor(category) : categoryFor(action + " " + target)),
      action,
      target,
      approval: getString(record, ["approval", "approvalRequirement", "requiresApproval"], "unspecified"),
      evidencePath: `capabilities[${index}]`,
      raw: record
    };
  });
}
