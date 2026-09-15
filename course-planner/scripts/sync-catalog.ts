import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { courseSnapshotSchema } from "../src/lib/course-schema";
import { combineNtustCourseOfferings, mapNtustCourse, NTUST_COURSE_API_URL, type NtustCourseApiRecord } from "../src/lib/ntust-course-api";
import { campusOptions, teachingOptions, type QueryCatalog } from "../src/lib/query-options";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = NTUST_COURSE_API_URL.replace(/courses$/, "");
const write = process.argv.includes("--write");
const requested = process.argv.find((arg) => arg.startsWith("--semesters="))?.slice(12).split(",");
const resume = process.argv.includes("--resume");
const indexOnly = process.argv.includes("--index-only");
const retrievedAt = new Date().toISOString();
let requestCount = 0;
const historicalSemesters = new Set<string>();

async function api<T>(endpoint: string, body?: Record<string, unknown>): Promise<T> {
  const attempts = body && body.CourseNo === "" ? 1 : 3;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      requestCount++;
      const response = await fetch(base + endpoint, {
        method: body ? "POST" : "GET",
        headers: { "content-type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(45_000),
      });
      if (!response.ok) throw new Error(`${endpoint}: HTTP ${response.status}`);
      return await response.json() as T;
    } catch (error) {
      if (attempt === attempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  throw new Error("unreachable");
}

async function pool<T, R>(items: T[], task: (item: T) => Promise<R>): Promise<R[]> {
  const result: R[] = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      result[index] = await task(items[index]);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }));
  return result;
}

function query(semester: string, overrides: Record<string, unknown> = {}) {
  return api<NtustCourseApiRecord[]>("courses", {
    Semester: semester, CourseNo: "", CourseName: "", CourseTeacher: "", Dimension: "",
    CourseNotes: "", CampusNotes: "", ForeignLanguage: 0, OnlyIntensive: 0,
    OnlyGeneral: 0, OnleyNTUST: 0, OnlyMaster: 0, OnlyUnderGraduate: 0, OnlyNode: 0,
    Language: "zh", OldCourse: historicalSemesters.has(semester), ...overrides,
  });
}

async function main() {
  const semesters = await api<Array<{ Semester: string; EngSemester: string; CurrentSemester: boolean }>>("semestersinfo");
  semesters.filter((s) => !s.CurrentSemester).forEach((s) => historicalSemesters.add(s.Semester.trim()));
  const colleges = await api<Array<{ CollegeNo: string; CollegeName: string }>>("Colleges/");
  const departmentLists = await pool(colleges, async (college) => {
    const departments = await api<Array<{ DeptNo: string; Department: string }>>(`departments?collegeNo=${college.CollegeNo}`);
    return departments.map((dept) => ({ code: dept.DeptNo, name: dept.Department, college: college.CollegeNo }));
  });
  const dimensions = await api<Array<{ DimNo: string; DimContent: string }>>("dimensions");
  const catalog: QueryCatalog = {
    retrievedAt, semesters: [], colleges: colleges.map((c) => ({ code: c.CollegeNo, name: c.CollegeName })),
    departments: departmentLists.flat(), dimensions: dimensions.map((d) => ({ code: d.DimNo, name: d.DimContent })),
  };
  const selected = requested ? semesters.filter((s) => requested.includes(s.Semester.trim())) : semesters;
  if (requested && selected.length !== requested.length) throw new Error("Unknown semester requested");
  const outputDirectory = path.join(root, "public", "courses");
  if (write) await mkdir(outputDirectory, { recursive: true });

  // Partition by the leading course-code character; external courses use 3T/3N
  // plus a digit to avoid the school's unbounded-query timeout.
  const prefixes = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ012456789", ...Array.from({ length: 10 }, (_, n) => `3T${n}`), ...Array.from({ length: 10 }, (_, n) => `3N${n}`)];
  const facetQueries: Array<[string, Record<string, unknown>]> = [
    ...campusOptions.map(([code]) => [code, { CampusNotes: code }] as [string, Record<string, unknown>]),
    ...teachingOptions.filter(([code]) => code !== "Intensive").map(([code]) => [code, { CourseNotes: code }] as [string, Record<string, unknown>]),
    ["Intensive", { OnlyIntensive: 1 }], ["general", { OnlyGeneral: 1 }],
    ["foreign", { ForeignLanguage: 1 }], ["LCC", { CourseNotes: "LCC" }],
    ["master", { OnlyMaster: 1 }], ["undergraduate", { OnlyUnderGraduate: 1 }],
  ];
  for (const selectedSemester of selected) {
    const semester = selectedSemester.Semester.trim();
    const file = `${semester.replace(/\s/g, "")}.json`;
    const output = path.join(outputDirectory, file);
    if (resume || indexOnly) {
      try {
        const previous = courseSnapshotSchema.parse(JSON.parse(await readFile(output, "utf8")));
        if (previous.semester !== semester || previous.scope.type !== "full-semester" || previous.offerings.some((course) => !course.facets)) throw new Error(`${semester}: incomplete resumed snapshot`);
        const needsLabelMigration = previous.offerings.some((course) => course.enrollmentText?.startsWith("已選 "));
        if (needsLabelMigration) {
          previous.offerings.forEach((course) => { course.enrollmentText = course.enrollmentText?.replace(/^已選 (\d+)／名額 (\d+)$/, "本校已選 $1／總已選 $2"); });
          if (write) await writeFile(output, JSON.stringify(previous) + "\n");
        }
        catalog.semesters.push({ semester, label: `${semester}（${selectedSemester.EngSemester}）`, file, count: previous.offerings.length });
        console.log(`${semester}: resumed ${previous.offerings.length} courses`);
        continue;
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
      if (indexOnly) continue;
    }
    console.log(`${semester}: fetching partitioned course list`);
    const responses = await pool(prefixes, (prefix) => query(semester, { CourseNo: prefix }));
    // Identical source rows can occur in multiple prefix responses.
    const records = [...new Map(responses.flat().map((record) => [JSON.stringify(record), record])).values()];
    if (records.length === 0) throw new Error(`${semester}: empty course list; refusing to publish`);
    console.log(`${semester}: ${records.length} rows; fetching official filter membership`);
    const memberships = await pool(facetQueries, async ([facet, overrides]) => {
      console.log(`${semester}: querying ${facet}`);
      let matching: NtustCourseApiRecord[];
      try {
        matching = await query(semester, overrides);
      } catch {
        console.log(`${semester}: ${facet} query exceeded source limits; using bounded partitions`);
        const activePrefixes = prefixes.filter((prefix) => records.some((record) => record.CourseNo?.startsWith(prefix)));
        matching = (await pool(activePrefixes, (prefix) => query(semester, { ...overrides, CourseNo: prefix }))).flat();
      }
      return [facet, new Set(matching.map((record) => record.CourseNo?.trim()))] as const;
    });
    const mapped = combineNtustCourseOfferings(records.map((record) => mapNtustCourse(record, retrievedAt)));
    const snapshot = courseSnapshotSchema.parse({
      semester, source: NTUST_COURSE_API_URL, retrievedAt,
      scope: { type: "full-semester", description: `${semester} 學年期完整課程（含校際課程）` },
      offerings: mapped.map(({ offering }) => ({ ...offering, facets: memberships.filter(([, courseNos]) => courseNos.has(offering.courseNo)).map(([facet]) => facet) })),
    });
    catalog.semesters.push({ semester, label: `${semester}（${selectedSemester.EngSemester}）`, file, count: snapshot.offerings.length });
    if (write) await writeFile(output, JSON.stringify(snapshot) + "\n");
    console.log(`${semester}: ${snapshot.offerings.length} courses validated; ${write ? "written" : "dry run"}`);
  }
  if (write) await writeFile(path.join(root, "src", "data", "catalog-index.json"), JSON.stringify(catalog, null, 2) + "\n");
  console.log(`${catalog.semesters.length} semesters; ${requestCount} requests; ${write ? "catalog written" : "dry run only"}`);
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
