import { PERIODS, WEEKDAYS, type CourseOffering } from "@/lib/course";
import { dayNames } from "@/lib/course-display";
export function ScheduleGrid({ courses }: { courses: CourseOffering[] }) {
  if (!courses.length) return <div className="empty-plan"><span aria-hidden="true">▦</span><h3>開始安排你的這一週</h3><p>在課程旁按「加入」，課表會顯示在這裡。</p></div>;
  const days = courses.some((course) => course.meetings.some((meeting) => meeting.weekday === "S" || meeting.weekday === "U")) ? WEEKDAYS : WEEKDAYS.slice(0, 5);
  return <div className="timetable-scroll" tabIndex={0} aria-label="每週課表，可橫向捲動"><table className="timetable"><caption className="sr-only">候選課表上課時段</caption><thead><tr><th scope="col">節</th>{days.map((day) => <th key={day} scope="col">週{dayNames[day]}</th>)}</tr></thead><tbody>{PERIODS.map((period) => <tr key={period}><th scope="row">{period}</th>{days.map((day) => {
    const matches = courses.filter((course) => course.meetings.some((meeting) => meeting.weekday === day && meeting.period === period));
    return <td key={day} className={matches.length > 1 ? "clash" : ""}>{matches.map((course) => <div key={course.courseNo} className="timetable-course" title={`${course.courseNo} ${course.title}`}><span>{course.title}</span><small>{course.meetings.find((meeting) => meeting.weekday === day && meeting.period === period)?.location}</small></div>)}</td>;
  })}</tr>)}</tbody></table></div>;
}
