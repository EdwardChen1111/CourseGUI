import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { courseSnapshotSchema } from "../src/lib/course-schema";
import {
  calculateCourseSnapshotDiff,
  combineNtustCourseOfferings,
  mapNtustCourse,
  NTUST_COURSE_API_URL,
  type NtustCourseApiRecord,
} from "../src/lib/ntust-course-api";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

type SyncOptions = {
  semester: string;
  courseName: string;
  outputPath: string;
  write: boolean;
};

function readOption(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

function getOptions(): SyncOptions {
  const semester = readOption("semester") ?? "1151";
  const courseName = readOption("course-name") ?? "";
  const outputPath = readOption("output") ?? `src/data/courses/${semester}.json`;

  if (!/^\d{4}$/.test(semester)) {
    throw new Error("--semester must use the ROC academic format, for example 1151");
  }

  return { semester, courseName, outputPath, write: process.argv.includes("--write") };
}

function getSafeOutputPath(outputPath: string): string {
  const resolved = path.resolve(projectRoot, outputPath);
  const relative = path.relative(projectRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("--output must point to a file inside this project");
  }
  return resolved;
}

async function readPreviousSnapshot(outputPath: string) {
  try {
    const content = JSON.parse(await readFile(outputPath, "utf8")) as unknown;
    return courseSnapshotSchema.parse(content);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

async function main() {
  const options = getOptions();
  const outputPath = getSafeOutputPath(options.outputPath);
  const retrievedAt = new Date().toISOString();
  const response = await fetch(NTUST_COURSE_API_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      Semester: options.semester,
      CourseNo: "",
      CourseName: options.courseName,
      CourseTeacher: "",
      Dimension: "",
      CourseNotes: "",
      ForeignLanguage: 0,
      OnlyGeneral: 0,
      OnleyNTUST: 0,
      OnlyMaster: 0,
      OnlyUnderGraduate: 0,
      OnlyNode: 0,
      Language: "zh",
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) throw new Error(`NTUST course API returned ${response.status}`);
  const records = (await response.json()) as NtustCourseApiRecord[];
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("NTUST course API returned no course records; no snapshot was created");
  }

  const mapped = combineNtustCourseOfferings(records.map((record) => mapNtustCourse(record, retrievedAt)));
  const snapshot = courseSnapshotSchema.parse({
    semester: options.semester,
    source: NTUST_COURSE_API_URL,
    retrievedAt,
    scope: {
      type: options.courseName ? "filtered-query" : "full-semester",
      description: options.courseName
        ? `${options.semester} 學期「${options.courseName}」課名篩選結果`
        : `${options.semester} 學期全校課程`,
    },
    offerings: mapped.map((result) => result.offering),
  });
  const scheduleWarnings = mapped.flatMap((result) => result.unrecognizedScheduleTokens);
  const previous = await readPreviousSnapshot(outputPath);

  console.log(`received ${snapshot.offerings.length} course offering(s) for ${options.semester}`);
  console.log(`unrecognized schedule token(s): ${scheduleWarnings.length}`);
  if (previous) {
    const diff = calculateCourseSnapshotDiff(previous, snapshot);
    console.log(`diff: +${diff.addedCourseNos.length} / -${diff.removedCourseNos.length} / ~${diff.changedCourseNos.length}`);
  } else {
    console.log("diff: no previous snapshot");
  }

  if (!options.write) {
    console.log("dry run only; pass --write to save the validated snapshot");
    return;
  }

  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`wrote ${path.relative(projectRoot, outputPath)}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
