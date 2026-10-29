import type { QueryCatalog } from "./query-options";

/** A partial refresh replaces only the semesters checked in that refresh. */
export function mergeCatalog(previous: QueryCatalog, refreshed: QueryCatalog, officialOrder: string[]): QueryCatalog {
  const touched = new Set([...refreshed.semesters, ...(refreshed.unavailableSemesters ?? [])].map((entry) => entry.semester));
  const rank = (semester: string) => { const index = officialOrder.indexOf(semester); return index < 0 ? officialOrder.length : index; };
  return {
    ...refreshed,
    semesters: [...refreshed.semesters, ...previous.semesters.filter((entry) => !touched.has(entry.semester))].sort((a, b) => rank(a.semester) - rank(b.semester)),
    unavailableSemesters: [...(refreshed.unavailableSemesters ?? []), ...(previous.unavailableSemesters ?? []).filter((entry) => !touched.has(entry.semester))],
  };
}
