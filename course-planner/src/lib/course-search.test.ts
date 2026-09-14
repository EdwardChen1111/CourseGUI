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
