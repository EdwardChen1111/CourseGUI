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
        missingRequiredCourseNos: ["MA102"],
        isComplete: false,
      },
    ]);
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
