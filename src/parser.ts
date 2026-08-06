import fs from "node:fs";
import type { Capability, CapabilityCategory } from "./types.js";

const categories: CapabilityCategory[] = ["filesystem", "network", "messaging", "browser", "shell", "database", "secrets"];
const stringFields = [
  "id", "name", "category", "type", "action", "verb", "operation",
  "target", "resource", "scope", "description"
];
const approvalFields = ["approval", "approvalRequirement"];

function categoryFor(value: string): CapabilityCategory {
  const text = value.toLowerCase();
  return categories.find((category) => text.includes(category)) ?? "unknown";
}

function getString(record: Record<string, unknown>, names: string[], fallback = ""): string {
  for (const name of names) {
    const value = record[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallback;
}

function getApproval(record: Record<string, unknown>): string {
  const approval = getString(record, ["approval", "approvalRequirement", "requiresApproval"]);
  if (approval) return approval;

  const requiresApproval = record.requiresApproval;
  if (typeof requiresApproval === "boolean") {
    return requiresApproval ? "required" : "not required";
  }
  return "unspecified";
}

function validateFields(record: Record<string, unknown>, path: string): void {
  for (const field of stringFields) {
    if (Object.prototype.hasOwnProperty.call(record, field) && typeof record[field] !== "string") {
      throw new Error(`Manifest field "${path}.${field}" must be a string`);
    }
  }
  for (const field of approvalFields) {
    if (Object.prototype.hasOwnProperty.call(record, field)) {
      const value = record[field];
      if (typeof value !== "string" || !value.trim()) {
        throw new Error(`Manifest field "${path}.${field}" must be a non-empty string`);
      }
    }
  }
  if (Object.prototype.hasOwnProperty.call(record, "requiresApproval")) {
    const value = record.requiresApproval;
    if ((typeof value !== "string" || !value.trim()) && typeof value !== "boolean") {
      throw new Error(`Manifest field "${path}.requiresApproval" must be a non-empty string or boolean`);
    }
  }
}

export function parseManifestFile(file: string): Capability[] {
  const raw = fs.readFileSync(file, "utf8");
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Manifest must be a JSON object");
  }
  return parseManifest(data as Record<string, unknown>);
}

export function parseManifest(data: Record<string, unknown>): Capability[] {
  const sourceKey = ["capabilities", "permissions", "tools"].find((key) =>
    Object.prototype.hasOwnProperty.call(data, key)
  );
  if (!sourceKey) {
    throw new Error("Manifest must contain a capabilities, permissions, or tools array");
  }
  const source = data[sourceKey];
  if (!Array.isArray(source)) {
    throw new Error(`Manifest field "${sourceKey}" must be an array`);
  }
  return source.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`Manifest field "${sourceKey}[${index}]" must be an object`);
    }
    const record = item as Record<string, unknown>;
    validateFields(record, `${sourceKey}[${index}]`);
    const action = getString(record, ["action", "verb", "operation", "name"], "use");
    const target = getString(record, ["target", "resource", "scope", "description"], "unspecified");
    const category = getString(record, ["category", "type"], "");
    const id = getString(record, ["id", "name"], `${category || categoryFor(action + " " + target)}:${action}:${target}`);
    return {
      id,
      category: (category ? categoryFor(category) : categoryFor(action + " " + target)),
      action,
      target,
      approval: getApproval(record),
      evidencePath: `${sourceKey}[${index}]`,
      raw: record
    };
  });
}
