import type { Capability, DiffEntry } from "./types.js";

const highCategories = new Set(["shell", "secrets", "database"]);
const writeWords = /write|send|delete|update|create|publish|execute|run|install|uninstall/i;

export function classify(kind: DiffEntry["kind"], before: Capability | undefined, after: Capability | undefined): Pick<DiffEntry, "risk" | "reason" | "reviewerQuestion"> {
  const capability = after ?? before;
  if (!capability) {
    return { risk: "low", reason: "No capability details were available.", reviewerQuestion: "Can the requester provide the missing manifest entry?" };
  }
  if (kind === "removed") {
    return { risk: "low", reason: "Capability was removed.", reviewerQuestion: "Does removing this scope break any expected workflow?" };
  }
  if (highCategories.has(capability.category) || writeWords.test(`${capability.action} ${capability.target}`)) {
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
