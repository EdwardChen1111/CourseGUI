import { describe, expect, it } from "vitest";
import { mergeCatalog } from "./catalog-merge";
import type { QueryCatalog } from "./query-options";
const base: QueryCatalog = { retrievedAt: "test", semesters: [], colleges: [], departments: [], dimensions: [] };
const semester = (semester: string, count = 5) => ({ semester, count, label: semester, file: `${semester}.json` });
describe("partial catalog refresh", () => {
  it("retains history and replaces updated counts in official order", () => {
    const result = mergeCatalog({ ...base, semesters: [semester("1151"), semester("1142")] }, { ...base, semesters: [semester("1151", 8)] }, ["1151", "1142"]);
    expect(result.semesters).toEqual([semester("1151", 8), semester("1142")]);
  });
  it("retains new unavailable evidence and removes stale status on recovery", () => {
    const issue = { semester: "1142", label: "1142", reason: "source failure", checkedAt: "test" };
    const unavailable = mergeCatalog({ ...base, semesters: [semester("1142")] }, { ...base, unavailableSemesters: [issue] }, ["1151", "1142"]);
    expect(unavailable.semesters).toEqual([]);
    expect(unavailable.unavailableSemesters).toEqual([issue]);
    expect(mergeCatalog(unavailable, { ...base, semesters: [semester("1142")] }, ["1142"]).unavailableSemesters).toEqual([]);
  });
});
