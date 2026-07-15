export type CapabilityCategory =
  | "filesystem"
  | "network"
  | "messaging"
  | "browser"
  | "shell"
  | "database"
  | "secrets"
  | "unknown";

export type Capability = {
  id: string;
  category: CapabilityCategory;
  action: string;
  target: string;
  approval: string;
  evidencePath: string;
  raw?: unknown;
};

export type DiffEntry = {
  kind: "added" | "removed" | "changed";
  id: string;
  before?: Capability;
  after?: Capability;
  risk: "low" | "medium" | "high";
  reason: string;
  reviewerQuestion: string;
};

export type DiffReport = {
  summary: {
    added: number;
    removed: number;
    changed: number;
    highRisk: number;
  };
  entries: DiffEntry[];
};
