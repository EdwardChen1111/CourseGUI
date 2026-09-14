import { describe, expect, it } from "vitest";

import { demoRequirementSet } from "@/lib/requirements-data";

describe("demoRequirementSet", () => {
  it("is explicitly marked as a non-official presentation rule", () => {
    expect(demoRequirementSet.departmentCode).toBe("DEMO");
    expect(demoRequirementSet.departmentName).toContain("非正式");
  });
});
