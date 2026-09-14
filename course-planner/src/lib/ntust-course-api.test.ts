import { describe, expect, it } from "vitest";

import type { CourseSnapshot } from "@/lib/course";
import { calculateCourseSnapshotDiff, combineNtustCourseOfferings, mapNtustCourse } from "@/lib/ntust-course-api";

const retrievedAt = "2026-09-14T00:00:00.000Z";

describe("NTUST course API adapter", () => {
  it("maps the documented public API fields and preserves schedule locations", () => {
    const result = mapNtustCourse(
      {
        Semester: "1151",
        CourseNo: "3N1154701",
        CourseName: "基礎微積分",
        CourseTeacher: "森元俊成",
        CreditPoint: "3",
        RequireOption: "E",
        AllYear: "H",
        ChooseStudent: 12,
        AllStudent: 45,
        ClassRoomNo: "公館 E302、公館 E302、公館 E302",
        Node: "R6,R7,R8",
        Contents: "師大課程／限外系",
      },
      retrievedAt,
    );

    expect(result.offering).toMatchObject({
      courseNo: "3N1154701",
      credits: 3,
      requiredType: "elective",
      yearType: "half",
      enrollmentText: "已選 12／名額 45",
      meetings: [
        { weekday: "R", period: "6", location: "公館 E302" },
        { weekday: "R", period: "7", location: "公館 E302" },
        { weekday: "R", period: "8", location: "公館 E302" },
      ],
    });
    expect(result.unrecognizedScheduleTokens).toEqual([]);
  });

  it("reports added, removed and changed courses without treating timestamps as a change", () => {
    const base: CourseSnapshot = {
      semester: "1151",
      source: "https://example.test/courses",
      retrievedAt,
      offerings: [
        {
          semester: "1151",
          courseNo: "KEEP",
          title: "Keep",
          credits: 3,
          requiredType: "elective",
          yearType: "half",
          instructors: ["Teacher"],
          meetings: [],
          sourceUpdatedAt: retrievedAt,
        },
        {
          semester: "1151",
          courseNo: "REMOVE",
          title: "Remove",
          credits: 3,
          requiredType: "elective",
          yearType: "half",
          instructors: ["Teacher"],
          meetings: [],
          sourceUpdatedAt: retrievedAt,
        },
      ],
    };
    const next: CourseSnapshot = {
      ...base,
      retrievedAt: "2026-09-15T00:00:00.000Z",
      offerings: [
        { ...base.offerings[0], sourceUpdatedAt: "2026-09-15T00:00:00.000Z" },
        { ...base.offerings[0], courseNo: "CHANGE", title: "Changed", sourceUpdatedAt: "2026-09-15T00:00:00.000Z" },
        { ...base.offerings[0], courseNo: "ADD", title: "Add", sourceUpdatedAt: "2026-09-15T00:00:00.000Z" },
      ],
    };

    const changedNext: CourseSnapshot = {
      ...next,
      offerings: next.offerings.map((offering) =>
        offering.courseNo === "KEEP" ? { ...offering, credits: 4 } : offering,
      ),
    };

    expect(calculateCourseSnapshotDiff(base, changedNext)).toEqual({
      addedCourseNos: ["ADD", "CHANGE"],
      removedCourseNos: ["REMOVE"],
      changedCourseNos: ["KEEP"],
    });
  });

  it("combines the API's separate meeting rows into one selectable course", () => {
    const offerings = combineNtustCourseOfferings([
      mapNtustCourse(
        {
          Semester: "1151",
          CourseNo: "CS161A001",
          CourseName: "微積分(上)",
          CourseTeacher: "許之凡",
          CreditPoint: "4",
          RequireOption: "R",
          AllYear: "H",
          Node: "M6,M7",
          ClassRoomNo: "TR-213",
        },
        retrievedAt,
      ),
      mapNtustCourse(
        {
          Semester: "1151",
          CourseNo: "CS161A001",
          CourseName: "微積分(上)",
          CourseTeacher: "許之凡",
          CreditPoint: "4",
          RequireOption: "R",
          AllYear: "H",
          Node: "W10,R6,R7",
          ClassRoomNo: "TR-409-2",
        },
        retrievedAt,
      ),
    ]);

    expect(offerings).toHaveLength(1);
    expect(offerings[0].offering.meetings).toEqual([
      { weekday: "M", period: "6", location: "TR-213" },
      { weekday: "M", period: "7", location: "TR-213" },
      { weekday: "W", period: "10", location: "TR-409-2" },
      { weekday: "R", period: "6", location: "TR-409-2" },
      { weekday: "R", period: "7", location: "TR-409-2" },
    ]);
  });
});
