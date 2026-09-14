import { describe, expect, it } from "vitest";

import { calculateRequirementSetDiff } from "@/lib/requirement-import";
import { requirementSetSchema } from "@/lib/requirements";

const baseRequirementSet = requirementSetSchema.parse({
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
  reviewStatus: "draft",
  groups: [
    {
      id: "technical-electives",
      name: "技術選修",
      minimumCredits: 6,
      requiredCourseNos: [],
      creditEligibleCourseNos: ["CS201", "CS202"],
    },
  ],
});

describe("calculateRequirementSetDiff", () => {
  it("ignores retrieval-time and eligible-course ordering changes", () => {
    const reordered = requirementSetSchema.parse({
      ...baseRequirementSet,
      sourceRetrievedAt: "2026-09-15T00:00:00.000Z",
      groups: [{ ...baseRequirementSet.groups[0], creditEligibleCourseNos: ["CS202", "CS201"] }],
    });

    expect(calculateRequirementSetDiff(baseRequirementSet, reordered)).toEqual({
      metadataChanged: false,
      addedGroupIds: [],
      removedGroupIds: [],
      changedGroupIds: [],
    });
  });

  it("reports metadata and group changes for an import review", () => {
    const updated = requirementSetSchema.parse({
      ...baseRequirementSet,
      version: "2026-09-15",
      groups: [
        { ...baseRequirementSet.groups[0], minimumCredits: 9 },
        { id: "capstone", name: "專題", minimumCredits: 3, requiredCourseNos: ["CS401"] },
      ],
    });

    expect(calculateRequirementSetDiff(baseRequirementSet, updated)).toEqual({
      metadataChanged: true,
      addedGroupIds: ["capstone"],
      removedGroupIds: [],
      changedGroupIds: ["technical-electives"],
    });
  });
});
