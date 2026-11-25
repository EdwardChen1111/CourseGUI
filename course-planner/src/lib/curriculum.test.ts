import { describe, expect, it } from "vitest";
import { academicSchema, emptyAcademic, type AcademicData } from "./academic-records";
import { curriculumSources, evaluateSheet, sheets, type Recognition } from "./curriculum";

const byId = (id: string) => sheets.find((sheet) => sheet.id === id)!;
const record = (courseNo: string, credits: number, status: "passed" | "taking" = "passed"): AcademicData["records"][number] =>
  ({ id: courseNo, courseNo, credits, status, title: "修課紀錄", semester: "1141" });
describe("材料系科目表", () => {
  it("distinguishes the admission year and verifies the source directories", () => {
    const years = new Set(curriculumSources.map((source) => source.year));
    for (const year of years) {
      expect(curriculumSources.filter((source) => source.year === year).map((source) => source.category).sort())
        .toEqual(["double-major", "minor"]);
    }
    for (const source of curriculumSources) {
      expect(new URL(source.url).hostname).toMatch(/\.ntust\.edu\.tw$/);
      expect(new Set(source.departments.map((dept) => dept.name)).size).toBe(source.departments.length);
      expect(source.departments.every((dept) => dept.page > 1)).toBe(true);
    }
    expect(byId("114-TX-major").groups.flatMap((group) => group.subjects).some((row) => row.title === "計算機程式與應用")).toBe(true);
    expect(byId("114-TX-major").groups.some((group) => group.label === "人工智慧任選一科")).toBe(false);
    expect(byId("115-TX-major").groups.find((group) => group.label === "人工智慧任選一科")?.subjects).toHaveLength(4);
  });
  it("requires every compulsory subject and three separate elective credits", () => {
    const sheet = byId("115-TX-double-major");
    const required = sheet.groups[0].subjects.map((row) => record(row.codes[0] + "01", row.credits));
    expect(required.reduce((sum, item) => sum + item.credits, 0)).toBe(39);
    const records = [...required, record("TX499A001", 2), record("TX499A002", 2), record("TX499B001", 2, "taking")];
    expect(evaluateSheet(sheet, records).map((group) => group.complete)).toEqual([true, false]);
    expect(evaluateSheet(sheet, [...records, record("TX499B002", 2)])[1].complete).toBe(true);
    expect(evaluateSheet(sheet, [...records.slice(1), record("TX2409301", 9)])[0].complete).toBe(false);
  });
  it("counts an accepted equivalence once, honors source limits and requires an earned record", () => {
    const sheet = byId("115-TX-minor");
    const [first, second] = sheet.groups[0].subjects;
    const decision: Recognition = { sheetId: sheet.id, fromCode: first.codes[0], target: second.title, credits: 3, evidence: "個別核定" };
    const data = [record(first.codes[0] + "01", 3)];
    const rows = evaluateSheet(sheet, data, [decision])[0].rows;
    expect(rows[0].passed).toBe(false);
    expect(rows[1].passed).toBe(true);
    expect(evaluateSheet(sheet, [], [decision])[0].achieved).toBe(0);
    expect(evaluateSheet(sheet, [record("CE1001301", 3)], [{ ...decision, fromCode: "CE10013" }])[0].achieved).toBe(0);
    expect(evaluateSheet(sheet, data, [{ ...decision, credits: 2 }])[0].rows[1].passed).toBe(false);
  });
  it("accepts earlier backups and preserves tracking and recognition in newer ones", () => {
    expect(academicSchema.parse(emptyAcademic)).toEqual(emptyAcademic);
    const backup = { ...emptyAcademic, trackedSheets: ["114-TX-major"], recognitions: [] };
    expect(academicSchema.parse(JSON.parse(JSON.stringify(backup)))).toEqual(backup);
  });
});
