import type { CourseOffering } from "@/lib/course";

const requiredTypeLabels: Record<CourseOffering["requiredType"], string> = {
  required: "必修",
  elective: "選修",
  unknown: "必選修未提供",
};

const yearTypeLabels: Record<CourseOffering["yearType"], string> = {
  full: "全學年",
  half: "半學年",
  unknown: "開課類型未提供",
};

export function getCourseTypeLabels(course: CourseOffering): string[] {
  return [requiredTypeLabels[course.requiredType], yearTypeLabels[course.yearType]];
}

export function getUniqueCourseLocations(course: CourseOffering): string[] {
  return [...new Set(course.meetings.flatMap((meeting) => (meeting.location ? [meeting.location] : [])))];
}
