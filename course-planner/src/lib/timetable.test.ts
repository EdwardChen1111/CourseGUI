import { describe, expect, it } from "vitest";

import type { CourseOffering } from "@/lib/course";
import { buildTimetable, coursesInTimetable } from "@/lib/timetable";

const sourceUpdatedAt = "2026-09-14T00:00:00.000Z";
const course = (courseNo: string, meetings: CourseOffering["meetings"]): CourseOffering => ({
  semester: "1151",
  courseNo,
  title: courseNo,
  credits: 3,
  requiredType: "elective",
  yearType: "half",
  instructors: ["Teacher"],
  meetings,
  sourceUpdatedAt,
});

describe("buildTimetable", () => {
  it("places all course meetings in their weekly cells and keeps a collision visible", () => {
    const cells = buildTimetable([
      course("ONE", [{ weekday: "M", period: "6" }, { weekday: "R", period: "7" }]),
      course("TWO", [{ weekday: "M", period: "6" }]),
    ]);

    expect(cells).toHaveLength(98);
    expect(cells.find((cell) => cell.weekday === "M" && cell.period === "6")?.courses.map((item) => item.courseNo)).toEqual(["ONE", "TWO"]);
    expect(cells.find((cell) => cell.weekday === "R" && cell.period === "7")?.courses.map((item) => item.courseNo)).toEqual(["ONE"]);
  });

  it("excludes courses without a known meeting from the visual timetable", () => {
    const scheduled = course("SCHEDULED", [{ weekday: "T", period: "9" }]);
    const unscheduled = course("UNSCHEDULED", []);

    expect(coursesInTimetable([scheduled, unscheduled])).toEqual([scheduled]);
  });
});
