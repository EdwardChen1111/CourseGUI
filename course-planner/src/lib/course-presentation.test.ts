import { describe, expect, it } from "vitest";

import { getCourseTypeLabels, getUniqueCourseLocations } from "@/lib/course-presentation";

const course = {
  semester: "1151",
  courseNo: "CS101",
  title: "程式設計",
  credits: 3,
  requiredType: "required" as const,
  yearType: "half" as const,
  instructors: ["王教授"],
  meetings: [
    { weekday: "M" as const, period: "1" as const, location: "TR-101" },
    { weekday: "M" as const, period: "2" as const, location: "TR-101" },
    { weekday: "W" as const, period: "1" as const, location: "TR-102" },
  ],
  sourceUpdatedAt: "2026-09-14T00:00:00.000Z",
};

describe("course presentation", () => {
  it("returns human-readable course type labels", () => {
    expect(getCourseTypeLabels(course)).toEqual(["必修", "半學年"]);
  });

  it("keeps each course location only once", () => {
    expect(getUniqueCourseLocations(course)).toEqual(["TR-101", "TR-102"]);
  });
});
