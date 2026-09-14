import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { calculateRequirementSetDiff } from "../src/lib/requirement-import";
import { requirementSetSchema, type RequirementSet } from "../src/lib/requirements";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

type ImportOptions = {
  inputPath: string;
  outputPath: string;
  write: boolean;
  allowReviewed: boolean;
};

function readOption(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

function resolveProjectPath(relativePath: string, optionName: string): string {
  const resolved = path.resolve(projectRoot, relativePath);
  const relative = path.relative(projectRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${optionName} must point to a file inside this project`);
  }
  return resolved;
}

function getSafeFileName(requirements: RequirementSet): string {
  if (!/^[a-z0-9-]+$/i.test(requirements.id)) {
    throw new Error("requirement set id must contain only letters, numbers, and hyphens when --output is omitted");
  }
  return `${requirements.id}.json`;
}

async function readRequirementSet(filePath: string): Promise<RequirementSet | undefined> {
  try {
    return requirementSetSchema.parse(JSON.parse(await readFile(filePath, "utf8")) as unknown);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

async function getOptions(): Promise<ImportOptions> {
  const input = readOption("input");
  if (!input) throw new Error("--input is required, for example --input=drafts/cs-112.json");

  const inputPath = resolveProjectPath(input, "--input");
  const incoming = await readRequirementSet(inputPath);
  if (!incoming) throw new Error(`--input file does not exist: ${input}`);

  if (incoming.reviewStatus === "demo") {
    throw new Error("demo requirement sets cannot be imported into the release data directory");
  }
  if (incoming.reviewStatus === "reviewed" && !process.argv.includes("--allow-reviewed")) {
    throw new Error("reviewed requirement sets require --allow-reviewed after the audit trail has been checked");
  }

  const output = readOption("output") ?? `src/data/requirements/${getSafeFileName(incoming)}`;
  return {
    inputPath,
    outputPath: resolveProjectPath(output, "--output"),
    write: process.argv.includes("--write"),
    allowReviewed: process.argv.includes("--allow-reviewed"),
  };
}

async function main() {
  const options = await getOptions();
  const incoming = await readRequirementSet(options.inputPath);
  if (!incoming) throw new Error("input requirement set disappeared before it could be imported");
  const previous = await readRequirementSet(options.outputPath);

  console.log(`candidate: ${incoming.id} (${incoming.category}, ${incoming.entryYear}, ${incoming.degreeType})`);
  console.log(`review status: ${incoming.reviewStatus}${options.allowReviewed ? " (explicitly allowed)" : ""}`);
  console.log(`groups: ${incoming.groups.length}`);
  if (previous) {
    const diff = calculateRequirementSetDiff(previous, incoming);
    console.log(`diff: metadata ${diff.metadataChanged ? "changed" : "unchanged"}; +${diff.addedGroupIds.length} / -${diff.removedGroupIds.length} / ~${diff.changedGroupIds.length} groups`);
  } else {
    console.log("diff: no previous requirement set at output path");
  }

  if (!options.write) {
    console.log("dry run only; pass --write to save the validated requirement set");
    return;
  }

  await writeFile(options.outputPath, `${JSON.stringify(incoming, null, 2)}\n`, "utf8");
  console.log(`wrote ${path.relative(projectRoot, options.outputPath)}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
