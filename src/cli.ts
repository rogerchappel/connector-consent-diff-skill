#!/usr/bin/env node
import fs from "node:fs";
import { diffCapabilities } from "./diff.js";
import { parseManifestFile } from "./parser.js";
import { renderJson, renderMarkdown } from "./render.js";

function help(): string {
  return "Usage: connector-consent-diff <before.json> <after.json> [--format markdown|json] [--output file]";
}

type Options = {
  beforeFile: string;
  afterFile: string;
  format: "markdown" | "json";
  output?: string;
};

function requireValue(args: string[], index: number, option: string, description: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${option} requires ${description}`);
  return value;
}

function parseArgs(args: string[]): Options {
  const files: string[] = [];
  let format: Options["format"] = "markdown";
  let output: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--format") {
      const value = requireValue(args, index, "--format", "a value");
      if (value !== "markdown" && value !== "json") throw new Error("--format must be markdown or json");
      format = value;
      index += 1;
    } else if (arg === "--output") {
      output = requireValue(args, index, "--output", "a file path");
      index += 1;
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    } else if (files.length >= 2) {
      throw new Error(`Unexpected argument: ${arg}`);
    } else {
      files.push(arg);
    }
  }
  if (files.length < 2) throw new Error("Both before.json and after.json are required");
  return { beforeFile: files[0], afterFile: files[1], format, output };
}

const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log(help());
  process.exit(0);
}

try {
  const options = parseArgs(args);
  const report = diffCapabilities(parseManifestFile(options.beforeFile), parseManifestFile(options.afterFile));
  const rendered = options.format === "json" ? renderJson(report) : renderMarkdown(report);
  if (options.output) fs.writeFileSync(options.output, rendered);
  else process.stdout.write(rendered);
  process.exit(report.summary.highRisk > 0 ? 2 : 0);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}\n${help()}`);
  process.exit(1);
}
