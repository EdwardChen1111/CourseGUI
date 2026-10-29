import type { CourseOffering } from "@/lib/course";
export const dayNames: Record<string, string> = { M: "一", T: "二", W: "三", R: "四", F: "五", S: "六", U: "日" };
export function scheduleLabel(course: CourseOffering): string {
  const days = new Map<string, Set<string>>();
  course.meetings.forEach(({ weekday, period }) => {
    if (!days.has(weekday)) days.set(weekday, new Set());
    days.get(weekday)!.add(period);
  });
  return [...days].map(([day, periods]) => `週${dayNames[day]} ${[...periods].join("、")}節`).join(" / ") || "未提供可排課時段";
}
export function hasIncompleteSchedule(course: CourseOffering): boolean {
  return course.meetings.length === 0 || Boolean(course.hasUnrecognizedSchedule);
}
export function schoolLabel(course: CourseOffering): string {
  return course.courseNo.startsWith("3T") ? "臺大" : course.courseNo.startsWith("3N") ? "師大" : "臺科大";
}
