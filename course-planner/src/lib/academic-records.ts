import { z } from "zod";
import { requirementSetSchema, type RequirementSet } from "@/lib/requirements";
export const academicSchema = z.object({
  version: z.literal(1),
  profile: z.object({ entryYear: z.string().regex(/^\d{0,3}$/), department: z.string().max(100), degree: z.enum(["undergraduate", "master"]) }),
  records: z.array(z.object({ id: z.string().min(1), courseNo: z.string().trim().min(1).max(40), title: z.string().trim().min(1).max(200), credits: z.number().min(0).max(30), semester: z.string().max(10), status: z.enum(["passed", "taking", "failed"]) })).max(2000),
  requirements: z.array(requirementSetSchema).max(20),
});
export type AcademicData = z.infer<typeof academicSchema>;
export const ACADEMIC_KEY = "ntust:academic:v1";
export const emptyAcademic: AcademicData = { version: 1, profile: { entryYear: "", department: "", degree: "undergraduate" }, records: [], requirements: [] };
/** A 9-character section and its 7-character curriculum code denote one subject. */
export function subjectCode(code: string): string {
  const normalized = code.trim().toUpperCase();
  return /^[A-Z]{2}[A-Z0-9]{5}\d{2}$/.test(normalized) ? normalized.slice(0, 7) : normalized;
}
export function earnedCourses(records: AcademicData["records"]) {
  const unique = new Map<string, { courseNo: string; credits: number }>();
  for (const record of records.filter((item) => item.status === "passed")) {
    const code = subjectCode(record.courseNo);
    const previous = unique.get(code);
    if (!previous || record.credits > previous.credits) unique.set(code, { courseNo: code, credits: record.credits });
  }
  return [...unique.values()];
}
export function academicProgress(requirements: RequirementSet, records: AcademicData["records"]) {
  const earned = earnedCourses(records);
  return requirements.groups.map((group) => {
    const eligible = new Set((group.creditEligibleCourseNos ?? group.requiredCourseNos).map(subjectCode));
    const credits = earned.filter((item) => eligible.has(item.courseNo)).reduce((total, item) => total + item.credits, 0);
    const missing = group.requiredCourseNos.filter((code) => !earned.some((item) => item.courseNo === subjectCode(code)));
    return { ...group, credits, missing, complete: credits >= group.minimumCredits && missing.length === 0 };
  });
}
