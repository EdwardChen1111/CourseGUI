import { z } from "zod";

export const requirementReviewStatusSchema = z.enum(["demo", "draft", "reviewed"]);
export type RequirementReviewStatus = z.infer<typeof requirementReviewStatusSchema>;

export const requirementGroupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  minimumCredits: z.number().nonnegative(),
  requiredCourseNos: z.array(z.string().min(1)).default([]),
  creditEligibleCourseNos: z.array(z.string().min(1)).min(1).optional(),
  notes: z.string().min(1).optional(),
}).superRefine((group, context) => {
  const countableCourseNos = group.creditEligibleCourseNos ?? group.requiredCourseNos;
  const duplicateCourseNos = countableCourseNos.filter((courseNo, index) => countableCourseNos.indexOf(courseNo) !== index);

  if (duplicateCourseNos.length > 0) {
    context.addIssue({
      code: "custom",
      message: "credit-eligible course numbers must be unique",
      path: ["creditEligibleCourseNos"],
    });
  }

  if (group.creditEligibleCourseNos && group.requiredCourseNos.some((courseNo) => !group.creditEligibleCourseNos?.includes(courseNo))) {
    context.addIssue({
      code: "custom",
      message: "every required course number must also be credit-eligible",
      path: ["creditEligibleCourseNos"],
    });
  }
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
  sourceTitle: z.string().min(1),
  sourceRetrievedAt: z.iso.datetime(),
  reviewStatus: requirementReviewStatusSchema,
  reviewedBy: z.string().min(1).optional(),
  reviewedAt: z.iso.datetime().optional(),
  reviewNotes: z.string().min(1).optional(),
  groups: z.array(requirementGroupSchema).min(1),
}).superRefine((requirements, context) => {
  if (requirements.reviewStatus !== "reviewed") return;

  (["reviewedBy", "reviewedAt", "reviewNotes"] as const).forEach((field) => {
    if (!requirements[field]) {
      context.addIssue({
        code: "custom",
        message: `${field} is required when reviewStatus is reviewed`,
        path: [field],
      });
    }
  });
});

export type RequirementReviewPresentation = {
  label: string;
  description: string;
  isOfficial: boolean;
};

export function getRequirementReviewPresentation(status: RequirementReviewStatus): RequirementReviewPresentation {
  if (status === "reviewed") {
    return { label: "已人工審核", description: "此規則已依來源與審核紀錄完成資料審查，仍須以校方正式審核為準。", isOfficial: true };
  }
  if (status === "draft") {
    return { label: "審核中", description: "此規則正在與原始公告核對，尚不可作為正式修課判定。", isOfficial: false };
  }
  return { label: "展示資料", description: "此區塊僅驗證介面與計算流程，並非正式修課規則。", isOfficial: false };
}

export type RequirementProgress = {
  groupId: string;
  groupName: string;
  completedCredits: number;
  minimumCredits: number;
  creditEligibleCourseCount: number;
  missingRequiredCourseNos: string[];
  isComplete: boolean;
};

export function calculateRequirementProgress(requirements: z.infer<typeof requirementSetSchema>, completedCourses: Array<{ courseNo: string; credits: number }>): RequirementProgress[] {
  const completedCourseNos = new Set(completedCourses.map((course) => course.courseNo));

  return requirements.groups.map((group) => {
    const creditEligibleCourseNos = group.creditEligibleCourseNos ?? group.requiredCourseNos;
    const matchingCourses = completedCourses.filter((course) => creditEligibleCourseNos.includes(course.courseNo));
    const completedCredits = matchingCourses.reduce((total, course) => total + course.credits, 0);
    const missingRequiredCourseNos = group.requiredCourseNos.filter((courseNo) => !completedCourseNos.has(courseNo));

    return {
      groupId: group.id,
      groupName: group.name,
      completedCredits,
      minimumCredits: group.minimumCredits,
      creditEligibleCourseCount: creditEligibleCourseNos.length,
      missingRequiredCourseNos,
      isComplete: missingRequiredCourseNos.length === 0 && completedCredits >= group.minimumCredits,
    };
  });
}
