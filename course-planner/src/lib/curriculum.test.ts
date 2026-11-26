import { describe, expect, it } from "vitest";
import { academicSchema, emptyAcademic, type AcademicData } from "./academic-records";
import { curriculumSources, eligibleTarget, evaluateSheet, fitsDepartment, sheets, type Recognition } from "./curriculum";

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

describe("跨系科目表與學分缺額", () => {
  it("publishes every open annual table and keeps the two design majors separate", () => {
    expect(new Set(sheets.map((s) => s.id)).size).toBe(sheets.length);
    for (const [year, count] of [["112", 31], ["113", 31], ["114", 16], ["115", 16]] as const) {
      const majors = sheets.filter((s) => s.year === year && s.category === "major");
      expect(majors).toHaveLength(count);
      expect(majors.map((s) => s.department)).toEqual(expect.arrayContaining(["設計系工業設計組", "設計系商業設計組"]));
      for (const source of curriculumSources.filter((s) => s.year === year)) {
        const open = source.departments.filter((d) => !d.closed);
        const published = sheets.filter((s) => s.year === year && s.category === source.category);
        expect(published.map((s) => s.department).sort()).toEqual(open.map((d) => d.name).sort());
        for (const sheet of published) expect(sheet.url).toBe(source.url + "#page=" + open.find((d) => d.name === sheet.department)?.page);
      }
    }
    for (const sheet of sheets) {
      for (const group of sheet.groups) {
        expect(group.minimum).toBeGreaterThan(0);
        expect(group.subjects.length || group.manual).toBeTruthy();
        expect(new Set(group.subjects.map((s) => s.title)).size).toBe(group.subjects.length);
        const codes = group.subjects.flatMap((s) => s.codes);
        expect(new Set(codes).size, sheet.id + " " + group.label).toBe(codes.length);
      }
    }
  });

  it.each(["112", "113"])("checks published credit thresholds separately in cohort %s", (year) => {
    const deficits = (code: string) => evaluateSheet(byId(year + "-" + code), []).map((g) => g.missingCredits);
    expect(deficits("BA-minor")).toEqual([18, 6, 6]);
    expect(deficits("ET-double-major")).toEqual([20, 4, 2, 13, 15]);
    expect(deficits("CT-double-major")).toEqual([43]);
    expect(deficits("EE-double-major")).toEqual([18, 12, 3, 15]);
    for (const code of ["TB", "FB", "IB"]) {
      expect(Boolean(byId(year + "-" + code + "-double-major"))).toBe(year === "112");
    }
  });

  it("applies the 112 technology management area quotas to the overall elective total", () => {
    const tb = byId("112-TB-double-major");
    const target = tb.groups[3].manual!.target;
    const data = [record("TM55555", 3)];
    const approved = [{ sheetId: tb.id, target, credits: 3, fromCode: "TM55555", evidence: "系辦核定" }];
    expect(evaluateSheet(tb, data, approved).map((g) => g.missingCredits)).toEqual([18, 6, 6, 3, 21]);
  });

  it.each(["112", "113"])("shows earned credits and required lab pairings for historical electronics courses in %s", (year) => {
    const et = byId(year + "-ET-double-major");
    const project = et.groups[1].subjects[0].alternatives![0];
    const firstHalf = record(project[0].codes[0], 2);
    expect(evaluateSheet(et, [firstHalf])[1]).toMatchObject({ remaining: 1, missingCredits: 2, complete: false });
    expect(evaluateSheet(et, [firstHalf, record(project[1].codes[0], 2)])[1].complete).toBe(true);

    const ee = byId(year + "-EE-double-major");
    const course = (name: string) => {
      const item = ee.groups.flatMap((g) => g.subjects).find((s) => s.title === name)!;
      return record(item.codes[0], item.credits);
    };
    const labs = ["數位系統設計實習", "超大型積體電路設計實習"].map(course);
    expect(evaluateSheet(ee, labs)[2].achieved).toBe(0);
    expect(evaluateSheet(ee, [...labs, course("超大型積體電路設計導論")])[2].achieved).toBe(2);
  });

  it("matches historical study tracks and excludes ineligible AT electives", () => {
    const sheet = byId("113-AT-CS-major");
    expect(fitsDepartment(sheet, sheet.department.normalize("NFKC"))).toBe(true);
    expect(fitsDepartment(byId("113-AT-EE-major"), sheet.department)).toBe(false);
    const group = sheet.groups.find((g) => g.label === "本組專業選修")!;
    expect(eligibleTarget(group, "CS2002301")).toBe(true);
    expect(eligibleTarget(group, "CSG1123")).toBe(false);
    expect(eligibleTarget(group, "BA22013")).toBe(false);
    expect(eligibleTarget(group, group.manual!.excludedCodes![0])).toBe(false);
    expect(group.minimum).toBe(36);
  });

  it("keeps the global development language routes independent and sums approved courses within one route", () => {
    const sheet = byId("113-GDR-major");
    const i = sheet.groups.findIndex((g) => g.manual?.alternativeTarget);
    const rule = sheet.groups[i].manual!;
    expect(evaluateSheet(sheet, rule.eligible!.map((code) => record(code, 2)))[i].complete).toBe(true);
    const chemistry = sheet.groups.findIndex((g) => g.label.includes("GDR005"));
    const parts = sheet.groups[chemistry].subjects[0].alternatives![0];
    const replacements = [record("ME90501", 1), record("ME90502", 2)];
    const approved = replacements.map((c, j) => ({ sheetId: sheet.id, target: parts[j].title, credits: c.credits, fromCode: c.courseNo, evidence: "學程核定" }));
    expect(evaluateSheet(sheet, replacements, approved.slice(0, 1))[chemistry].missingCredits).toBe(2);
    expect(evaluateSheet(sheet, replacements, approved)[chemistry].complete).toBe(true);
    const courses = ["GD19001", "GD19002", "FL19001", "FL19002"].map((c) => record(c, 2));
    const enrollments = (targets: string[]) => courses.map((c, j) => ({
      fromCode: c.courseNo, sheetId: sheet.id, target: targets[j], credits: 2, evidence: "學程核定",
    }));
    expect(evaluateSheet(sheet, courses, enrollments([rule.target, rule.target, rule.alternativeTarget!, rule.alternativeTarget!]))[i].remaining).toBe(4);
    expect(evaluateSheet(sheet, courses, enrollments(courses.map(() => rule.alternativeTarget!)))[i].complete).toBe(true);
  });

  it("counts core subjects toward the CS minor total without requiring every elective", () => {
    const sheet = byId("115-CS-minor");
    const core = sheet.groups[0].subjects.slice(0, 5).map((s) => record(s.codes[0], 3));
    const [subjects, total] = evaluateSheet(sheet, [...core, record(core[0].courseNo + "01", 3), record("CS99999", 3, "taking")]);
    expect(subjects.complete).toBe(true);
    expect(total.remaining).toBe(6);
    const optional = sheet.groups[1].subjects.slice(11, 13).map((s) => record(s.codes[0], 3));
    expect(evaluateSheet(sheet, [...core, ...optional]).every((g) => g.complete)).toBe(true);
  });

  it("counts only eligible open electives and verified assignments in the MI minor", () => {
    const sheet = byId("115-MI-minor");
    const elective = sheet.groups[1].manual!;
    const records = [record(elective.eligible![0], 3), record(elective.eligible![0] + "01", 3),
      record("MI99999", 3), record("BA99999", 3)];
    const approved = (code: string): Recognition => ({ sheetId: sheet.id, target: elective.target, fromCode: code, credits: 3, evidence: "系辦核定" });
    expect(evaluateSheet(sheet, records, [approved("BA99999")])[1].remaining).toBe(3);
    expect(evaluateSheet(sheet, records, [approved("MI99999")])[1].complete).toBe(true);
    expect(evaluateSheet(byId("114-MI-minor"), records, [approved("MI99999")])[1].remaining).toBe(3);
  });

  it("keeps cohort-specific curricula, additional foundations and individual shortfalls", () => {
    expect(byId("114-TB-minor").groups[1].minimum).toBe(15);
    expect(byId("115-TB-minor").groups[1].minimum).toBe(6);
    expect(sheets.some((s) => s.id === "114-FB-double-major")).toBe(false);
    expect(byId("115-FB-double-major").groups[1].minimum).toBe(27);
    const ch = byId("114-CH-double-major");
    const first = ch.groups[0].subjects[0];
    expect(evaluateSheet(ch, [record(first.codes[0], 2)])[0]).toMatchObject({ missingCredits: 43, complete: false });
    const mi = byId("115-MI-double-major");
    expect(evaluateSheet(mi, [])[2]).toMatchObject({ remaining: 8, missingCredits: 24 });
  });

  it("checks both halves of the 114 electronics lecture/lab choice and caps BA internship credits", () => {
    const et = byId("114-ET-major");
    const choice = et.groups.findIndex((g) => g.label.includes("ET0009"));
    const [[lecture, lab]] = et.groups[choice].subjects[0].alternatives!;
    const passed = [record(lecture.codes[0], 3)];
    expect(evaluateSheet(et, passed)[choice].remaining).toBe(1);
    expect(evaluateSheet(et, [...passed, record(lab.codes[0], 1)])[choice].remaining).toBe(0);
    const ba = byId("115-BA-double-major");
    const index = ba.groups.findIndex((g) => g.manual?.cap === 5);
    const rule = ba.groups[index].manual!;
    const placements = rule.cappedCodes!.slice(0, 2).map((code) => record(code, 4));
    const decisions = placements.map((r) => ({ sheetId: ba.id, fromCode: r.courseNo, credits: r.credits, target: rule.target, evidence: "系辦核定" }));
    expect(evaluateSheet(ba, placements, decisions)[index]).toMatchObject({ achieved: 5, remaining: 13 });
  });

  it("requires a different passed lecture for each electrical lab and both parts of a project route", () => {
    const ee = byId("115-EE-double-major");
    const eeCourse = (title: string) => {
      const course = ee.groups.flatMap((group) => group.subjects).find((s) => s.title === title)!;
      return record(course.codes[0], course.credits);
    };
    const labs = ["數位系統設計實習", "超大型積體電路設計實習"].map(eeCourse);
    expect(evaluateSheet(ee, labs)[2].achieved).toBe(0);
    expect(evaluateSheet(ee, [...labs, eeCourse("超大型積體電路設計導論")])[2].achieved).toBe(1);
    expect(evaluateSheet(ee, [...labs, eeCourse("超大型積體電路設計導論"), eeCourse("類比及混合訊號積體電路與系統")])[2].achieved).toBe(2);
    const et = byId("115-ET-major");
    const group = et.groups.findIndex((g) => g.label.includes("ET0007"));
    const [up, placement] = et.groups[group].subjects[0].alternatives![1];
    expect(evaluateSheet(et, [record(up.codes[0], 2)])[group].complete).toBe(false);
    expect(evaluateSheet(et, [record(up.codes[0], 2), record(placement.codes[0], 3)])[group].complete).toBe(true);
  });
});
