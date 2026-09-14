import { describe, expect, it } from "vitest";

import { calculateRequirementProgress, getRequirementReviewPresentation, requirementSetSchema } from "@/lib/requirements";

const requirements = requirementSetSchema.parse({
  id: "cs-112-undergraduate",
  category: "major",
  departmentCode: "CS",
  departmentName: "資訊工程系",
  entryYear: "112",
  degreeType: "undergraduate",
  version: "2026-09-14",
  sourceUrl: "https://dss20.ntust.edu.tw/edua/list/lst_eduneed.aspx",
  sourceTitle: "資訊工程系必修科目表",
  sourceRetrievedAt: "2026-09-14T00:00:00.000Z",
  reviewStatus: "reviewed",
  reviewedBy: "課程資料審核者",
  reviewedAt: "2026-09-14T00:00:00.000Z",
  reviewNotes: "已按入學年度、學制與官方表格逐項核對。",
  groups: [{ id: "math", name: "基礎數學", minimumCredits: 4, requiredCourseNos: ["MA101", "MA102"] }],
});

describe("calculateRequirementProgress", () => {
  it("reports both credit and required-course gaps", () => {
    expect(calculateRequirementProgress(requirements, [{ courseNo: "MA101", credits: 4 }])).toEqual([
      {
        groupId: "math",
        groupName: "基礎數學",
        completedCredits: 4,
        minimumCredits: 4,
        creditEligibleCourseCount: 2,
        missingRequiredCourseNos: ["MA102"],
        isComplete: false,
      },
    ]);
  });

  it("counts electives that are explicitly eligible for a credit group", () => {
    const electiveRequirements = requirementSetSchema.parse({
      ...requirements,
      groups: [
        {
          id: "technical-electives",
          name: "技術選修",
          minimumCredits: 6,
          requiredCourseNos: [],
          creditEligibleCourseNos: ["CS201", "CS202", "CS203"],
        },
      ],
    });

    expect(calculateRequirementProgress(electiveRequirements, [
      { courseNo: "CS201", credits: 3 },
      { courseNo: "CS202", credits: 3 },
      { courseNo: "OTHER101", credits: 3 },
    ])).toMatchObject([
      {
        completedCredits: 6,
        minimumCredits: 6,
        creditEligibleCourseCount: 3,
        missingRequiredCourseNos: [],
        isComplete: true,
      },
    ]);
  });

  it("rejects a rule that marks a required course as ineligible for its own credit group", () => {
    expect(() => requirementSetSchema.parse({
      ...requirements,
      groups: [
        {
          id: "invalid",
          name: "不一致規則",
          minimumCredits: 3,
          requiredCourseNos: ["CS101"],
          creditEligibleCourseNos: ["CS102"],
        },
      ],
    })).toThrow("every required course number must also be credit-eligible");
  });

  it("rejects duplicate course numbers in a credit group", () => {
    expect(() => requirementSetSchema.parse({
      ...requirements,
      groups: [
        {
          id: "duplicate",
          name: "重複課號",
          minimumCredits: 3,
          requiredCourseNos: [],
          creditEligibleCourseNos: ["CS201", "CS201"],
        },
      ],
    })).toThrow("credit-eligible course numbers must be unique");
  });

  it("rejects duplicate group ids so an import has stable identities", () => {
    expect(() => requirementSetSchema.parse({
      ...requirements,
      groups: [
        { id: "core", name: "核心一", minimumCredits: 3, requiredCourseNos: ["CS101"] },
        { id: "core", name: "核心二", minimumCredits: 3, requiredCourseNos: ["CS102"] },
      ],
    })).toThrow("requirement group ids must be unique");
  });
});

describe("requirement review status", () => {
  it("requires an audit trail before a rule can be labelled reviewed", () => {
    const unreviewed = structuredClone(requirements);
    delete unreviewed.reviewedBy;

    expect(() => requirementSetSchema.parse(unreviewed)).toThrow("reviewedBy is required");
  });

  it("keeps draft and demonstration rules distinct from reviewed rules", () => {
    expect(getRequirementReviewPresentation("demo")).toMatchObject({ label: "展示資料", isOfficial: false });
    expect(getRequirementReviewPresentation("draft")).toMatchObject({ label: "審核中", isOfficial: false });
    expect(getRequirementReviewPresentation("reviewed")).toMatchObject({ label: "已人工審核", isOfficial: true });
  });
});
