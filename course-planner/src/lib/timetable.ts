import { PERIODS, WEEKDAYS, type CourseOffering, type Period, type Weekday } from "@/lib/course";

export type TimetableCell = {
  weekday: Weekday;
  period: Period;
  courses: CourseOffering[];
};

/** Builds a stable weekly grid so the UI can show both scheduled courses and collisions. */
export function buildTimetable(courses: CourseOffering[]): TimetableCell[] {
  return PERIODS.flatMap((period) =>
    WEEKDAYS.map((weekday) => ({
      weekday,
      period,
      courses: courses.filter((course) =>
        course.meetings.some((meeting) => meeting.weekday === weekday && meeting.period === period),
      ),
    })),
  );
}

export function coursesInTimetable(courses: CourseOffering[]): CourseOffering[] {
  return courses.filter((course) => course.meetings.length > 0);
}
