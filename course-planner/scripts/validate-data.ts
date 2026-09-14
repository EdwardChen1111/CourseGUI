import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { courseSnapshotSchema } from "../src/lib/course-schema";
import { requirementSetSchema } from "../src/lib/requirements";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readJsonFiles(directory: string): Promise<Array<{ fileName: string; value: unknown }>> {
  const fileNames = (await readdir(directory)).filter((fileName) => fileName.endsWith(".json"));
  return Promise.all(
    fileNames.map(async (fileName) => ({
      fileName,
      value: JSON.parse(await readFile(path.join(directory, fileName), "utf8")) as unknown,
    })),
  );
}

async function validateDirectory(label: string, directory: string, validate: (value: unknown) => { success: boolean; error?: { issues: Array<{ path: PropertyKey[]; message: string }> } }) {
  const files = await readJsonFiles(directory);
  if (files.length === 0) {
    throw new Error(`${label}: no JSON files found in ${directory}`);
  }

  let validFileCount = 0;
  for (const file of files) {
    const result = validate(file.value);
    if (!result.success) {
      const detail = result.error?.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") ?? "unknown validation error";
      throw new Error(`${label}: ${file.fileName} is invalid - ${detail}`);
    }
    validFileCount += 1;
  }

  console.log(`${label}: ${validFileCount} file(s) valid`);
}

async function main() {
  await validateDirectory(
    "course snapshots",
    path.join(projectRoot, "src", "data", "courses"),
    (value) => courseSnapshotSchema.safeParse(value),
  );
  await validateDirectory(
    "requirement sets",
    path.join(projectRoot, "src", "data", "requirements"),
    (value) => requirementSetSchema.safeParse(value),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
