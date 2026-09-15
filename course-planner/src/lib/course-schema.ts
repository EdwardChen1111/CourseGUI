import { z } from "zod";

export const meetingSchema = z.object({
  weekday: z.enum(["M", "T", "W", "R", "F", "S", "U"]),
  period: z.enum(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "A", "B", "C", "D"]),
  location: z.string().min(1).optional(),
});

export const courseOfferingSchema = z.object({
  semester: z.string().regex(/^\d{2,3}\s?[12H]$/, "semester must use the ROC academic format, such as 1151 or 114H"),
  courseNo: z.string().min(1),
  title: z.string().min(1),
  credits: z.number().nonnegative(),
  requiredType: z.enum(["required", "elective", "unknown"]),
  yearType: z.enum(["full", "half", "unknown"]),
  instructors: z.array(z.string().min(1)).min(1),
  enrollmentText: z.string().optional(),
  meetings: z.array(meetingSchema),
  notes: z.string().optional(),
  sourceUpdatedAt: z.iso.datetime(),
  dimension: z.string().optional(),
  facets: z.array(z.string()).optional(),
  hasUnrecognizedSchedule: z.boolean().optional(),
});

export const courseSnapshotSchema = z.object({
  semester: z.string().regex(/^\d{2,3}\s?[12H]$/),
  source: z.url(),
  retrievedAt: z.iso.datetime(),
  scope: z.object({
    type: z.enum(["full-semester", "filtered-query"]),
    description: z.string().min(1),
  }),
  offerings: z.array(courseOfferingSchema),
}).superRefine((snapshot, context) => {
  const courseNos = new Set<string>();
  snapshot.offerings.forEach((offering, index) => {
    if (offering.semester !== snapshot.semester) {
      context.addIssue({
        code: "custom",
        message: "offering semester must match snapshot semester",
        path: ["offerings", index, "semester"],
      });
    }
    if (courseNos.has(offering.courseNo)) {
      context.addIssue({
        code: "custom",
        message: "courseNo must be unique within a semester snapshot",
        path: ["offerings", index, "courseNo"],
      });
    }
    courseNos.add(offering.courseNo);
  });
});

export type ValidatedCourseOffering = z.infer<typeof courseOfferingSchema>;
export type ValidatedCourseSnapshot = z.infer<typeof courseSnapshotSchema>;
