import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { courseSnapshotSchema } from "../src/lib/course-schema";
import { emptyCourseSearchFilters, filterCourses, type CourseSearchFilters } from "../src/lib/course-search";
import { NTUST_COURSE_API_URL, type NtustCourseApiRecord } from "../src/lib/ntust-course-api";

async function main() {
  const snapshot = courseSnapshotSchema.parse(JSON.parse(await readFile("public/courses/1151.json", "utf8")));
  const cases: Array<[string, Record<string, unknown>, Partial<CourseSearchFilters>]> = [
    ["department", {}, {}],
    ["campus multiple", { CampusNotes: "Main_Campus,Hwa_Hsia_Campus" }, { campuses: ["Main_Campus", "Hwa_Hsia_Campus"] }],
    ["teaching multiple", { CourseNotes: "eng,EMI" }, { teachingTypes: ["eng", "EMI"] }],
    ["undergraduate", { OnlyUnderGraduate: 1 }, { onlyUndergraduate: true }],
    ["master", { OnlyMaster: 1 }, { onlyMaster: true }],
    ["combined degree", { OnlyMaster: 1, OnlyUnderGraduate: 1 }, { onlyMaster: true, onlyUndergraduate: true }],
  ];
  for (const [name, overrides, filters] of cases) {
    const response = await fetch(NTUST_COURSE_API_URL, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Semester: "1151", CourseNo: "CS", CourseName: "", CourseTeacher: "", Dimension: "", CourseNotes: "", CampusNotes: "", ForeignLanguage: 0, OnlyIntensive: 0, OnlyGeneral: 0, OnleyNTUST: 0, OnlyMaster: 0, OnlyUnderGraduate: 0, OnlyNode: 0, Language: "zh", ...overrides }),
      signal: AbortSignal.timeout(45_000),
    });
    assert(response.ok, `${name}: HTTP ${response.status}`);
    const records = await response.json() as NtustCourseApiRecord[];
    const expected = [...new Set(records.map((record) => record.CourseNo!.trim()))].sort();
    const actual = filterCourses(snapshot.offerings, { ...emptyCourseSearchFilters, department: "CS", ...filters }).map((course) => course.courseNo).sort();
    assert.deepEqual(actual, expected, name);
    console.log(`${name}: ${actual.length} course numbers match official API`);
  }
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
