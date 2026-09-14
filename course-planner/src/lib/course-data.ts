import sourceSnapshot from "@/data/courses/1151.json";
import { courseSnapshotSchema, type ValidatedCourseSnapshot } from "@/lib/course-schema";

export function parseCourseSnapshot(value: unknown): ValidatedCourseSnapshot {
  return courseSnapshotSchema.parse(value);
}

export const courseSnapshot = parseCourseSnapshot(sourceSnapshot);
