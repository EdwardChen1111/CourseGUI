import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { courseSnapshotSchema } from "../src/lib/course-schema";
import { requirementSetSchema } from "../src/lib/requirements";
import { campusOptions, teachingOptions, type QueryCatalog } from "../src/lib/query-options";

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
  const catalog = JSON.parse(await readFile(path.join(projectRoot, "src/data/catalog-index.json"), "utf8")) as QueryCatalog;
  const semesters = new Set<string>();
  const allowedFacets = new Set<string>([...campusOptions.map(([code]) => code), ...teachingOptions.map(([code]) => code), "general", "foreign", "LCC", "master", "undergraduate"]);
  for (const entry of catalog.semesters) {
    if (semesters.has(entry.semester) || !/^\d{2,3}[12H]\.json$/.test(entry.file)) throw new Error(`Invalid catalog entry: ${entry.semester}`);
    semesters.add(entry.semester);
    const snapshot = courseSnapshotSchema.parse(JSON.parse(await readFile(path.join(projectRoot, "public/courses", entry.file), "utf8")));
    if (snapshot.semester !== entry.semester || snapshot.offerings.length !== entry.count || snapshot.scope.type !== "full-semester" || snapshot.offerings.some((course) => !course.facets)) throw new Error(`Incomplete catalog snapshot: ${entry.semester}`);
    if (snapshot.offerings.some((course) => course.facets?.some((facet) => !allowedFacets.has(facet)))) throw new Error(`Unknown filter membership: ${entry.semester}`);
  }
  if (!semesters.size) throw new Error("Empty query catalog");
  for (const entry of catalog.unavailableSemesters ?? []) {
    if (semesters.has(entry.semester) || !entry.reason || !Number.isFinite(Date.parse(entry.checkedAt))) throw new Error(`Invalid unavailable semester: ${entry.semester}`);
    semesters.add(entry.semester);
  }
  console.log(`query catalog: ${catalog.semesters.length} complete semester(s), ${catalog.unavailableSemesters?.length ?? 0} explicitly source-unavailable`);
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
