import { z } from "zod";

export const requirementGroupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  minimumCredits: z.number().nonnegative(),
  requiredCourseNos: z.array(z.string().min(1)).default([]),
});

export const requirementSetSchema = z.object({
  id: z.string().min(1),
  category: z.enum(["major", "double-major", "minor"]),
  departmentCode: z.string().min(1),
  departmentName: z.string().min(1),
  entryYear: z.string().regex(/^\d{3}$/),
  degreeType: z.enum(["undergraduate", "master"]),
  version: z.string().min(1),
  sourceUrl: z.url(),
  verifiedAt: z.iso.datetime(),
  groups: z.array(requirementGroupSchema).min(1),
});

export type RequirementProgress = {
  groupId: string;
  groupName: string;
  completedCredits: number;
  minimumCredits: number;
  missingRequiredCourseNos: string[];
  isComplete: boolean;
};

export function calculateRequirementProgress(requirements: z.infer<typeof requirementSetSchema>, completedCourses: Array<{ courseNo: string; credits: number }>): RequirementProgress[] {
  const completedCourseNos = new Set(completedCourses.map((course) => course.courseNo));

  return requirements.groups.map((group) => {
    const matchingCourses = completedCourses.filter((course) => group.requiredCourseNos.includes(course.courseNo));
    const completedCredits = matchingCourses.reduce((total, course) => total + course.credits, 0);
    const missingRequiredCourseNos = group.requiredCourseNos.filter((courseNo) => !completedCourseNos.has(courseNo));

    return {
      groupId: group.id,
      groupName: group.name,
      completedCredits,
      minimumCredits: group.minimumCredits,
      missingRequiredCourseNos,
      isComplete: missingRequiredCourseNos.length === 0 && completedCredits >= group.minimumCredits,
    };
  });
}
