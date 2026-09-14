"use client";

import { useMemo, useState } from "react";

import { courseSnapshot } from "@/lib/course-data";
import type { CourseOffering } from "@/lib/course";
import { demoRequirementSet } from "@/lib/requirements-data";
import { calculateRequirementProgress } from "@/lib/requirements";
import { getConflictingMeetings, hasScheduleConflict } from "@/lib/schedule";

const offerings: CourseOffering[] = courseSnapshot.offerings;

function formatSchedule(course: CourseOffering): string {
  return course.meetings.map((meeting) => `${meeting.weekday}${meeting.period}`).join("、");
}

export function CoursePlanner() {
  const [query, setQuery] = useState("");
  const [selectedCourseNos, setSelectedCourseNos] = useState<string[]>([]);

  const filteredCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("zh-Hant");
    if (!normalizedQuery) return offerings;

    return offerings.filter((course) =>
      [course.courseNo, course.title, ...course.instructors]
        .join(" ")
        .toLocaleLowerCase("zh-Hant")
        .includes(normalizedQuery),
    );
  }, [query]);

  const plannedCourses = offerings.filter((course) => selectedCourseNos.includes(course.courseNo));
  const totalCredits = plannedCourses.reduce((total, course) => total + course.credits, 0);
  const requirementProgress = calculateRequirementProgress(
    demoRequirementSet,
    plannedCourses.map((course) => ({ courseNo: course.courseNo, credits: course.credits })),
  );
  const conflicts = plannedCourses.flatMap((course, index) =>
    plannedCourses.slice(index + 1).flatMap((otherCourse) => {
      const meetings = getConflictingMeetings(course.meetings, otherCourse.meetings);
      return meetings.length > 0 ? [{ course, otherCourse, meetings }] : [];
    }),
  );

  function addCourse(courseNo: string) {
    setSelectedCourseNos((current) => (current.includes(courseNo) ? current : [...current, courseNo]));
  }

  function removeCourse(courseNo: string) {
    setSelectedCourseNos((current) => current.filter((selectedCourseNo) => selectedCourseNo !== courseNo));
  }

  return (
    <section className="mx-auto grid max-w-6xl gap-8 px-6 py-14 lg:grid-cols-[1fr_0.8fr]">
      <div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-sky-700">1151 課程快照</p>
            <h2 className="mt-1 text-2xl font-bold">搜尋課程</h2>
          </div>
          <p className="text-sm text-slate-500">目前顯示 {filteredCourses.length} 門課</p>
        </div>

        <label className="mt-5 block text-sm font-semibold text-slate-700" htmlFor="course-search">
          課名、課號或教師
        </label>
        <input
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-sky-600 focus:ring-4 focus:ring-sky-100"
          id="course-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="例如：微積分、CE162A001"
          value={query}
        />

        <div className="mt-5 space-y-3">
          {filteredCourses.map((course) => {
            const isPlanned = selectedCourseNos.includes(course.courseNo);
            const conflictsWithPlan = plannedCourses.some(
              (plannedCourse) => plannedCourse.courseNo !== course.courseNo && hasScheduleConflict(course.meetings, plannedCourse.meetings),
            );

            return (
              <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" key={course.courseNo}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-sky-700">{course.courseNo}</p>
                    <h3 className="mt-1 text-lg font-bold">{course.title}</h3>
                  </div>
                  <button
                    className={isPlanned ? "rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700" : "rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white"}
                    onClick={() => (isPlanned ? removeCourse(course.courseNo) : addCourse(course.courseNo))}
                    type="button"
                  >
                    {isPlanned ? "移出課表" : "加入課表"}
                  </button>
                </div>
                <dl className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                  <div><dt className="inline font-semibold text-slate-800">教師：</dt><dd className="inline">{course.instructors.join("、")}</dd></div>
                  <div><dt className="inline font-semibold text-slate-800">學分：</dt><dd className="inline">{course.credits}</dd></div>
                  <div><dt className="inline font-semibold text-slate-800">時段：</dt><dd className="inline">{formatSchedule(course)}</dd></div>
                  <div><dt className="inline font-semibold text-slate-800">教室：</dt><dd className="inline">{course.meetings.map((meeting) => meeting.location).filter(Boolean).join("、")}</dd></div>
                </dl>
                {conflictsWithPlan && !isPlanned ? <p className="mt-3 text-sm font-medium text-rose-700">與候選課表中的課程衝堂</p> : null}
              </article>
            );
          })}
          {filteredCourses.length === 0 ? <p className="rounded-lg bg-slate-100 p-4 text-sm text-slate-600">找不到符合的課程。</p> : null}
        </div>
      </div>

      <aside className="h-fit rounded-2xl border border-sky-100 bg-white p-6 shadow-sm lg:sticky lg:top-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-sky-700">個人候選課表</p>
            <h2 className="mt-1 text-2xl font-bold">{totalCredits} 學分</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{plannedCourses.length} 門課</span>
        </div>

        <div className="mt-6 space-y-3">
          {plannedCourses.length === 0 ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">從左側加入想修的課程，開始規劃課表。</p> : null}
          {plannedCourses.map((course) => (
            <div className="rounded-lg border border-slate-200 p-4" key={course.courseNo}>
              <p className="font-semibold">{course.title}</p>
              <p className="mt-1 text-sm text-slate-600">{course.courseNo} · {formatSchedule(course)} · {course.credits} 學分</p>
            </div>
          ))}
        </div>

        <div className={conflicts.length ? "mt-6 rounded-lg bg-rose-50 p-4 text-sm text-rose-800" : "mt-6 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800"}>
          {conflicts.length
            ? conflicts.map(({ course, otherCourse, meetings }) => <p key={`${course.courseNo}-${otherCourse.courseNo}`}>{course.title} 與 {otherCourse.title} 在 {meetings.map((meeting) => `${meeting.weekday}${meeting.period}`).join("、")} 衝堂。</p>)
            : "目前候選課表沒有衝堂。"}
        </div>

        <section className="mt-6 border-t border-slate-200 pt-6" aria-labelledby="progress-heading">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-sky-700">修課進度</p>
              <h2 className="mt-1 text-lg font-bold" id="progress-heading">規則比對展示</h2>
            </div>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">非正式</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">此區塊使用示範規則驗證介面流程；正式系所、雙主修與輔系規則須完成來源審核後才會上線。</p>
          <div className="mt-4 space-y-3">
            {requirementProgress.map((group) => (
              <div className="rounded-lg bg-slate-50 p-4" key={group.groupId}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-800">{group.groupName}</p>
                  <span className={group.isComplete ? "text-sm font-semibold text-emerald-700" : "text-sm font-semibold text-slate-600"}>
                    {group.completedCredits} / {group.minimumCredits} 學分
                  </span>
                </div>
                {group.missingRequiredCourseNos.length > 0 ? (
                  <p className="mt-2 text-xs leading-5 text-slate-600">尚缺：{group.missingRequiredCourseNos.join("、")}</p>
                ) : (
                  <p className="mt-2 text-xs font-medium text-emerald-700">此示範規則已完成。</p>
                )}
              </div>
            ))}
          </div>
        </section>
      </aside>
    </section>
  );
}
