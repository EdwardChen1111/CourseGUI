import { readFile, writeFile } from "node:fs/promises";
import { courseSnapshotSchema } from "../src/lib/course-schema";
import { combineNtustCourseOfferings, mapNtustCourse, NTUST_COURSE_API_URL, type NtustCourseApiRecord } from "../src/lib/ntust-course-api";
import type { QueryCatalog } from "../src/lib/query-options";

async function main() {
  const catalog = JSON.parse(await readFile("src/data/catalog-index.json", "utf8")) as QueryCatalog;
  let repaired = 0;
  for (const entry of catalog.semesters) {
    const file = `public/courses/${entry.file}`;
    const snapshot = courseSnapshotSchema.parse(JSON.parse(await readFile(file, "utf8")));
    const targets = snapshot.offerings.filter((course) => course.hasUnrecognizedSchedule);
    if (!targets.length) continue;
    const prefixes = [...new Set(targets.map((course) => course.courseNo.startsWith("3") ? course.courseNo.slice(0, 3) : course.courseNo.slice(0, 2)))];
    const source: NtustCourseApiRecord[] = [];
    const stamp = new Date().toISOString();
    for (let offset = 0; offset < prefixes.length; offset += 2) {
      const batches = await Promise.all(prefixes.slice(offset, offset + 2).map(async (prefix) => {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const response = await fetch(NTUST_COURSE_API_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ Semester: snapshot.semester, CourseNo: prefix, CourseName: "", CourseTeacher: "", Dimension: "", CourseNotes: "", CampusNotes: "", ForeignLanguage: 0, OnlyIntensive: 0, OnlyGeneral: 0, OnleyNTUST: 0, OnlyMaster: 0, OnlyUnderGraduate: 0, OnlyNode: 0, Language: "zh", OldCourse: Number(snapshot.semester.slice(0, -1)) < 107 }), signal: AbortSignal.timeout(30000) });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json() as NtustCourseApiRecord[];
          } catch (error) { if (attempt === 2) throw error; }
        }
        throw new Error("unreachable");
      }));
      source.push(...batches.flat());
    }
    const mapped = new Map(combineNtustCourseOfferings(source.filter((record) => targets.some((target) => target.courseNo === record.CourseNo?.trim())).map((record) => mapNtustCourse(record, stamp))).map(({ offering }) => [offering.courseNo, offering]));
    let count = 0;
    for (const target of targets) {
      const updated = mapped.get(target.courseNo);
      if (!updated) throw new Error(`${snapshot.semester} ${target.courseNo}: missing from official response; refusing partial repair`);
      target.meetings = updated.meetings;
      target.hasUnrecognizedSchedule = updated.hasUnrecognizedSchedule;
      target.sourceSchedule = updated.sourceSchedule;
      target.sourceLocation = updated.sourceLocation;
      target.scheduleVerifiedAt = stamp;
      if (!target.hasUnrecognizedSchedule) count++;
    }
    courseSnapshotSchema.parse(snapshot);
    await writeFile(file, JSON.stringify(snapshot) + "\n");
    repaired += count;
    console.log(`${snapshot.semester}: ${count}/${targets.length} schedules repaired (${prefixes.length} bounded queries); original data timestamp retained`);
  }
  console.log(`Repaired ${repaired} historical course schedules`);
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
