import { describe, expect, it } from "vitest";

import type { CourseOffering } from "@/lib/course";
import { emptyCourseSearchFilters, filterCourses } from "@/lib/course-search";

const sourceUpdatedAt = "2026-09-14T00:00:00.000Z";
const course = (courseNo: string, title: string, credits: number, requiredType: CourseOffering["requiredType"], weekdays: Array<"M" | "T">): CourseOffering => ({
  semester: "1151",
  courseNo,
  title,
  credits,
  requiredType,
  yearType: "half",
  instructors: [courseNo === "MA101" ? "王老師" : "李老師"],
  meetings: weekdays.map((weekday) => ({ weekday, period: "6" })),
  sourceUpdatedAt,
});

const courses = [
  course("MA101", "微積分", 4, "required", ["M", "T"]),
  course("GE201", "通識數學", 2, "elective", ["T"]),
];

describe("filterCourses", () => {
  const catalogCourses = [
    { ...courses[0], courseNo: "CS101", facets: ["Main_Campus", "eng", "undergraduate"] },
    { ...courses[1], courseNo: "3T123", dimension: "A", facets: ["Hwa_Hsia_Campus", "general", "EMI", "master"] },
  ];
  it("intersects official campus, teaching, school and degree memberships", () => {
    expect(filterCourses(catalogCourses, { ...emptyCourseSearchFilters, campuses: ["Hwa_Hsia_Campus"], teachingTypes: ["EMI"], institution: "3T", onlyMaster: true }).map((item) => item.courseNo)).toEqual(["3T123"]);
    expect(filterCourses(catalogCourses, { ...emptyCourseSearchFilters, institution: "ntust" }).map((item) => item.courseNo)).toEqual(["CS101"]);
    expect(filterCourses(catalogCourses, { ...emptyCourseSearchFilters, teachingTypes: ["eng", "EMI"] })).toEqual([]);
    expect(filterCourses(catalogCourses, { ...emptyCourseSearchFilters, onlyMaster: true, onlyUndergraduate: true })).toEqual([]);
  });
  it("supports college, department, separate fields and general dimensions", () => {
    expect(filterCourses(catalogCourses, { ...emptyCourseSearchFilters, college: "2", departmentPrefixes: ["CS", "EE"], courseName: "微積分", instructor: "王" }).map((item) => item.courseNo)).toEqual(["CS101"]);
    expect(filterCourses(catalogCourses, { ...emptyCourseSearchFilters, category: "general", dimension: "A" }).map((item) => item.courseNo)).toEqual(["3T123"]);
    expect(filterCourses(catalogCourses, { ...emptyCourseSearchFilters, department: "EE" })).toEqual([]);
  });
  it("distinguishes any matching period from the whole-course restriction", () => {
    expect(filterCourses(courses, { ...emptyCourseSearchFilters, slots: ["M6"] }).map((item) => item.courseNo)).toEqual(["MA101"]);
    expect(filterCourses(courses, { ...emptyCourseSearchFilters, slots: ["M6"], onlyListedSlots: true })).toEqual([]);
    expect(filterCourses(courses, { ...emptyCourseSearchFilters, slots: ["M6", "T6"], onlyListedSlots: true })).toEqual(courses);
    expect(filterCourses(courses, { ...emptyCourseSearchFilters, onlyListedSlots: true })).toEqual([]);
    expect(filterCourses([{ ...courses[0], hasUnrecognizedSchedule: true }], { ...emptyCourseSearchFilters, slots: ["M6", "T6"], onlyListedSlots: true })).toEqual([]);
  });
  it("returns the complete loaded snapshot when filters are empty", () => {
    expect(filterCourses(courses, emptyCourseSearchFilters)).toEqual(courses);
  });

  it("intersects text, credit, required type and weekday filters", () => {
    expect(filterCourses(courses, {
      query: "王老師",
      minimumCredits: 3,
      requiredType: "required",
      weekdays: ["M"],
    }).map((item) => item.courseNo)).toEqual(["MA101"]);
  });

  it("does not match a course when a selected weekday is absent", () => {
    expect(filterCourses(courses, { ...emptyCourseSearchFilters, weekdays: ["M"], requiredType: "elective" })).toEqual([]);
  });
});
