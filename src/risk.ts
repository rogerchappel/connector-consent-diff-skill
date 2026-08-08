import type { Capability, DiffEntry } from "./types.js";

const highCategories = new Set(["shell", "secrets", "database"]);
const writeWords = new Set(["write", "send", "delete", "update", "create", "publish", "execute", "run", "install", "uninstall"]);
const approvalRequired = new Set(["required", "true", "yes", "always"]);
const approvalNotRequired = new Set(["not required", "false", "no", "never", "none"]);

function approvalState(value: string): "required" | "not required" | "unknown" {
  const normalized = value.trim().toLowerCase();
  if (approvalRequired.has(normalized)) return "required";
  if (approvalNotRequired.has(normalized)) return "not required";
  return "unknown";
}

function hasWriteAction(value: string): boolean {
  return value.toLowerCase().split(/[^a-z0-9]+/).some((token) => writeWords.has(token));
}

export function classify(kind: DiffEntry["kind"], before: Capability | undefined, after: Capability | undefined): Pick<DiffEntry, "risk" | "reason" | "reviewerQuestion"> {
  const capability = after ?? before;
  if (!capability) {
    return { risk: "low", reason: "No capability details were available.", reviewerQuestion: "Can the requester provide the missing manifest entry?" };
  }
  if (kind === "removed") {
    return { risk: "low", reason: "Capability was removed.", reviewerQuestion: "Does removing this scope break any expected workflow?" };
  }
  if (kind === "changed" && before && after && approvalState(before.approval) === "required" && approvalState(after.approval) === "not required") {
    return {
      risk: "high",
      reason: "The capability no longer requires explicit approval.",
      reviewerQuestion: "Why can this capability proceed without the previous approval gate?"
    };
  }
  if (highCategories.has(capability.category) || hasWriteAction(`${capability.action} ${capability.target}`)) {
    return {
      risk: "high",
      reason: `Adds or changes ${capability.category} capability with possible write or execution impact.`,
      reviewerQuestion: `Why does this workflow need ${capability.action} access to ${capability.target}, and what approval should gate it?`
    };
  }
  if (capability.category === "unknown" || capability.approval === "unspecified") {
    return {
      risk: "medium",
      reason: "Capability category or approval requirement is ambiguous.",
      reviewerQuestion: "Can the manifest name the permission category and approval requirement explicitly?"
    };
  }
  return {
    risk: "low",
    reason: "Read-like capability with an explicit category and approval statement.",
    reviewerQuestion: "Is this scope limited to the smallest useful resource?"
  };
}
