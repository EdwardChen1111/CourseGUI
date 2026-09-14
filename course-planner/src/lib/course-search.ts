import type { CourseOffering, Weekday } from "@/lib/course";

export type CourseSearchFilters = {
  query: string;
  minimumCredits: number;
  requiredType: "all" | CourseOffering["requiredType"];
  weekdays: Weekday[];
};

export const emptyCourseSearchFilters: CourseSearchFilters = {
  query: "",
  minimumCredits: 0,
  requiredType: "all",
  weekdays: [],
};

/** Filters only the loaded snapshot; it never implies that absent courses do not exist. */
export function filterCourses(courses: CourseOffering[], filters: CourseSearchFilters): CourseOffering[] {
  const normalizedQuery = filters.query.trim().toLocaleLowerCase("zh-Hant");

  return courses.filter((course) => {
    const matchesQuery = !normalizedQuery || [course.courseNo, course.title, ...course.instructors]
      .join(" ")
      .toLocaleLowerCase("zh-Hant")
      .includes(normalizedQuery);
    const matchesCredits = course.credits >= filters.minimumCredits;
    const matchesRequiredType = filters.requiredType === "all" || course.requiredType === filters.requiredType;
    const matchesWeekday = filters.weekdays.length === 0 || course.meetings.some((meeting) => filters.weekdays.includes(meeting.weekday));

    return matchesQuery && matchesCredits && matchesRequiredType && matchesWeekday;
  });
}
