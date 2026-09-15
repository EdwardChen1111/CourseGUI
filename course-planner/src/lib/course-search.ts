import type { CourseOffering, Weekday } from "@/lib/course";

export type CourseSearchFilters = {
  query: string;
  minimumCredits: number;
  requiredType: "all" | CourseOffering["requiredType"];
  weekdays: Weekday[];
  courseNo?: string;
  courseName?: string;
  instructor?: string;
  department?: string;
  college?: string;
  departmentPrefixes?: string[];
  institution?: string;
  category?: string;
  dimension?: string;
  campuses?: string[];
  teachingTypes?: string[];
  onlyMaster?: boolean;
  onlyUndergraduate?: boolean;
  slots?: string[];
  onlyListedSlots?: boolean;
};

export const emptyCourseSearchFilters: CourseSearchFilters = {
  query: "",
  minimumCredits: 0,
  requiredType: "all",
  weekdays: [],
  courseNo: "", courseName: "", instructor: "", department: "", institution: "all", category: "all",
  dimension: "", campuses: [], teachingTypes: [], onlyMaster: false, onlyUndergraduate: false,
  slots: [], onlyListedSlots: false,
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
    const contains = (value: string, term?: string) => !term?.trim() || value.toLocaleLowerCase("zh-Hant").includes(term.trim().toLocaleLowerCase("zh-Hant"));
    const facets = new Set(course.facets ?? []);
    const matchesFields = contains(course.courseNo, filters.courseNo) && contains(course.title, filters.courseName) && contains(course.instructors.join(" "), filters.instructor);
    const matchesDepartment = filters.department ? course.courseNo.startsWith(filters.department) : !filters.college || (filters.departmentPrefixes ?? []).some((prefix) => course.courseNo.startsWith(prefix));
    const institution = filters.institution ?? "all";
    const matchesInstitution = institution === "all" || (institution === "ntust" ? !course.courseNo.startsWith("3") : course.courseNo.startsWith(institution));
    const category = filters.category ?? "all";
    const matchesCategory = category === "all" || (category === "PE" || category === "EP" ? course.courseNo.startsWith(category) : facets.has(category));
    const matchesDimension = !filters.dimension || course.dimension === filters.dimension;
    const matchesCampus = !filters.campuses?.length || filters.campuses.some((campus) => facets.has(campus));
    const matchesTeaching = !filters.teachingTypes?.length || filters.teachingTypes.every((type) => facets.has(type));
    const matchesDegree = (!filters.onlyMaster || facets.has("master")) && (!filters.onlyUndergraduate || facets.has("undergraduate"));
    const slots = new Set(filters.slots ?? []);
    const courseSlots = course.meetings.map((meeting) => `${meeting.weekday}${meeting.period}`);
    const matchesSlots = filters.onlyListedSlots
      ? courseSlots.length > 0 && !course.hasUnrecognizedSchedule && courseSlots.every((slot) => slots.has(slot))
      : slots.size === 0 || courseSlots.some((slot) => slots.has(slot));
    return matchesQuery && matchesCredits && matchesRequiredType && matchesWeekday && matchesFields && matchesDepartment && matchesInstitution && matchesCategory && matchesDimension && matchesCampus && matchesTeaching && matchesDegree && matchesSlots;
  });
}
