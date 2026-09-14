export const COURSE_PLAN_STORAGE_KEY = "ntust-course-planner:selected-course-nos:v1";

/** Keeps browser-stored plans safe when a later course snapshot no longer contains a course. */
export function normalizeCourseSelection(value: unknown, availableCourseNos: Iterable<string>): string[] {
  if (!Array.isArray(value)) return [];

  const available = new Set(availableCourseNos);
  const selected = new Set<string>();
  value.forEach((courseNo) => {
    if (typeof courseNo === "string" && available.has(courseNo)) selected.add(courseNo);
  });
  return [...selected];
}
