import type { CourseOffering, Weekday } from "@/lib/course";
import { buildTimetable, coursesInTimetable } from "@/lib/timetable";

const weekdayLabels: Record<Weekday, string> = {
  M: "一",
  T: "二",
  W: "三",
  R: "四",
  F: "五",
  S: "六",
  U: "日",
};

type WeeklyTimetableProps = {
  courses: CourseOffering[];
};

export function WeeklyTimetable({ courses }: WeeklyTimetableProps) {
  const scheduledCourses = coursesInTimetable(courses);
  const cells = buildTimetable(scheduledCourses);

  if (courses.length === 0) {
    return <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">加入課程後，這裡會顯示每週課表。</p>;
  }

  if (scheduledCourses.length === 0) {
    return <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">已選課程沒有可辨識的上課時段，因此尚無法排入週課表。</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200" aria-label="每週課表">
      <div className="grid min-w-[46rem] grid-cols-[3rem_repeat(7,minmax(6rem,1fr))] text-xs">
        <div className="border-b border-r border-slate-200 bg-slate-50 p-2 text-center font-semibold text-slate-600">節次</div>
        {Object.entries(weekdayLabels).map(([weekday, label]) => (
          <div className="border-b border-r border-slate-200 bg-slate-50 p-2 text-center font-semibold text-slate-700" key={weekday}>
            週{label}
          </div>
        ))}
        {cells.map((cell, index) => {
          const isFirstDay = index % 7 === 0;
          const hasConflict = cell.courses.length > 1;
          return (
            <div
              className={isFirstDay ? "min-h-16 border-b border-r border-slate-200 bg-slate-50 p-2 text-center font-semibold text-slate-600" : "min-h-16 border-b border-r border-slate-200 p-1.5"}
              key={`${cell.weekday}-${cell.period}`}
            >
              {isFirstDay ? cell.period : cell.courses.map((course) => (
                <div
                  className={hasConflict ? "mb-1 rounded bg-rose-100 p-1.5 font-medium text-rose-900" : "mb-1 rounded bg-sky-100 p-1.5 font-medium text-sky-900"}
                  key={course.courseNo}
                  title={`${course.courseNo} ${course.title}`}
                >
                  <p className="truncate">{course.title}</p>
                  <p className="mt-0.5 truncate text-[10px] opacity-80">{course.courseNo}</p>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <p className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">藍色為已排課程；紅色格表示衝堂。</p>
    </div>
  );
}
