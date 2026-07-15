#!/usr/bin/env node
import fs from "node:fs";
import { diffCapabilities } from "./diff.js";
import { parseManifestFile } from "./parser.js";
import { renderJson, renderMarkdown } from "./render.js";

function help(): string {
  return "Usage: connector-consent-diff <before.json> <after.json> [--format markdown|json] [--output file]";
}

const args = process.argv.slice(2);
if (args.includes("--help") || args.length < 2) {
  console.log(help());
  process.exit(args.includes("--help") ? 0 : 1);
}
const [beforeFile, afterFile] = args;
const format = args[args.indexOf("--format") + 1] ?? "markdown";
const outputFlag = args.indexOf("--output");
const report = diffCapabilities(parseManifestFile(beforeFile), parseManifestFile(afterFile));
const rendered = format === "json" ? renderJson(report) : renderMarkdown(report);
if (outputFlag >= 0) fs.writeFileSync(args[outputFlag + 1], rendered);
else process.stdout.write(rendered);
process.exit(report.summary.highRisk > 0 ? 2 : 0);
