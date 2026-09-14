import { describe, expect, it } from "vitest";

import { normalizeCourseSelection } from "@/lib/course-plan";

describe("normalizeCourseSelection", () => {
  it("keeps unique courses that exist in the current snapshot", () => {
    expect(normalizeCourseSelection(["CE162A001", "MISSING", "CE162A001", "CS161A001"], ["CE162A001", "CS161A001"])).toEqual([
      "CE162A001",
      "CS161A001",
    ]);
  });

  it("drops malformed saved values", () => {
    expect(normalizeCourseSelection({ selected: ["CE162A001"] }, ["CE162A001"])).toEqual([]);
  });
});
