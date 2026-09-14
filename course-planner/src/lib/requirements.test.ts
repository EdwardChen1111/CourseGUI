import { describe, expect, it } from "vitest";

import { calculateRequirementProgress, requirementSetSchema } from "@/lib/requirements";

const requirements = requirementSetSchema.parse({
  id: "cs-112-undergraduate",
  category: "major",
  departmentCode: "CS",
  departmentName: "資訊工程系",
  entryYear: "112",
  degreeType: "undergraduate",
  version: "2026-09-14",
  sourceUrl: "https://dss20.ntust.edu.tw/edua/list/lst_eduneed.aspx",
  verifiedAt: "2026-09-14T00:00:00.000Z",
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
