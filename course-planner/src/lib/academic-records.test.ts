import { expect, it } from "vitest";
import { academicProgress, earnedCourses, subjectCode, type AcademicData } from "./academic-records";
import type { RequirementSet } from "./requirements";
it("counts only passed subjects and deduplicates repeated sections", () => {
  const records: AcademicData["records"] = [
    { id: "a", courseNo: "CS1001301", title: "程式設計", credits: 3, semester: "1121", status: "failed" },
    { id: "b", courseNo: "CS1001302", title: "程式設計", credits: 3, semester: "1131", status: "passed" },
    { id: "c", courseNo: "CS1001301", title: "程式設計", credits: 3, semester: "1141", status: "passed" },
    { id: "d", courseNo: "CS2001301", title: "資料結構", credits: 3, semester: "1141", status: "taking" },
  ];
  expect(earnedCourses(records)).toEqual([{ courseNo: "CS10013", credits: 3 }]);
  expect(subjectCode("3T1001701")).toBe("3T1001701");
  const rule = { groups: [{ id: "required", name: "必修", minimumCredits: 6, requiredCourseNos: ["CS10013", "CS20013"] }] } as RequirementSet;
  expect(academicProgress(rule, records)[0]).toMatchObject({ credits: 3, missing: ["CS20013"], complete: false });
});
