import { describe, expect, it } from "vitest";
import { createWorkspace, csvCell, mergeBackup, parseBackup } from "./planner-workspace";
describe("portable semester plans", () => {
  it("retains missing course numbers so a data refresh cannot silently delete a plan", () => {
    const value = createWorkspace("1142", ["OLD101", "OLD101", "CS123"]);
    expect(parseBackup(value, "1142").plans[0].courseNos).toEqual(["OLD101", "CS123"]);
    expect(() => parseBackup(value, "1151")).toThrow("請先切換學期");
  });
  it("imports as independent plans instead of overwriting the current selections", () => {
    const current = createWorkspace("1131", ["ORIGINAL"]);
    const merged = mergeBackup(current, createWorkspace("1131", ["BACKUP"]), () => "imported");
    expect(merged.plans.map((plan) => plan.courseNos)).toEqual([["ORIGINAL"], ["BACKUP"]]);
    expect(merged.activeId).toBe("imported");
    expect(() => parseBackup({ ...current, activeId: "absent" }, "1131")).toThrow();
  });
  it("escapes spreadsheet formula cells and embedded quotes", () => {
    expect(csvCell('=HYPERLINK("bad")')).toBe('"\'=HYPERLINK(""bad"")"');
    expect(csvCell("正常課程")).toBe('"正常課程"');
  });
});
