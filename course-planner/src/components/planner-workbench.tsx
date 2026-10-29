"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CourseOffering, CourseSnapshot } from "@/lib/course";
import type { QueryCatalog } from "@/lib/query-options";
import { campusOptions, teachingOptions } from "@/lib/query-options";
import { QueryFilters } from "./query-filters";
import { PlanPanel } from "./plan-panel";
import { getCourseTypeLabels, getUniqueCourseLocations } from "@/lib/course-presentation";
import { emptyCourseSearchFilters, filterCourses, type CourseSearchFilters } from "@/lib/course-search";
import { hasScheduleConflict } from "@/lib/schedule";
import { hasIncompleteSchedule, scheduleLabel, schoolLabel } from "@/lib/course-display";
import { usePlannerWorkspace } from "@/lib/use-planner-workspace";

const PAGE_SIZE = 20;
export function CoursePlanner({ snapshot, catalog }: { snapshot: CourseSnapshot; catalog: QueryCatalog }) {
  const state = usePlannerWorkspace(snapshot.semester);
  const { workspace, update, ready } = state;
  const activePlan = workspace.plans.find((plan) => plan.id === workspace.activeId)!;
  const [filters, setFilters] = useState<CourseSearchFilters>(emptyCourseSearchFilters);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("courseNo");
  const [hideConflicts, setHideConflicts] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [mobileView, setMobileView] = useState("search");
  const [message, setMessage] = useState("");
  const [undo, setUndo] = useState<string[] | null>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const selected = activePlan.courseNos;
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const courses = useMemo(() => new Map(snapshot.offerings.map((course) => [course.courseNo, course])), [snapshot]);
  const planned = selected.flatMap((id) => courses.has(id) ? [courses.get(id)!] : []);
  const conflictIds = new Set(snapshot.offerings.filter((course) => !selectedSet.has(course.courseNo) && planned.some((other) => hasScheduleConflict(course.meetings, other.meetings))).map((course) => course.courseNo));
  const results = filterCourses(snapshot.offerings, filters)
    .filter((course) => (!showSaved || selectedSet.has(course.courseNo)) && (!hideConflicts || (!conflictIds.has(course.courseNo) && !hasIncompleteSchedule(course))))
    .sort((a, b) => sort === "credits" ? b.credits - a.credits || a.courseNo.localeCompare(b.courseNo) : sort === "title" ? a.title.localeCompare(b.title, "zh-Hant") : a.courseNo.localeCompare(b.courseNo));
  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  useEffect(() => {
    const timer = setTimeout(() => {
      const query = new URLSearchParams(window.location.search).get("q");
      if (query) setFilters((previous) => ({ ...previous, query }));
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  function changeFilters(value: CourseSearchFilters) { setFilters(value); setPage(1); }
  function resetFilters() { changeFilters(emptyCourseSearchFilters); setHideConflicts(false); setShowSaved(false); }
  function setSelection(next: string[]) {
    update({ ...workspace, plans: workspace.plans.map((plan) => plan.id === activePlan.id ? { ...plan, courseNos: next } : plan) });
  }
  function toggle(course: CourseOffering) {
    if (selectedSet.has(course.courseNo)) {
      setUndo(selected); setSelection(selected.filter((id) => id !== course.courseNo)); setMessage(`已移除「${course.title}」`);
    } else {
      if (selected.length >= 200) { setMessage("每個方案最多 200 門課程。"); return; }
      setUndo(null); setSelection([...selected, course.courseNo]);
      setMessage(`已加入「${course.title}」${conflictIds.has(course.courseNo) ? "，請注意衝堂" : hasIncompleteSchedule(course) ? "，時段不足，請核對校方課表" : ""}`);
    }
  }
  return <div className="planner-workspace">
    <div className="mobile-switch" aria-label="切換工作區"><button aria-pressed={mobileView === "search"} onClick={() => setMobileView("search")}>查詢課程</button><button aria-pressed={mobileView === "plan"} onClick={() => setMobileView("plan")}>我的課表 · {selected.length}</button></div>
    <div className="workspace-grid">
      <div className={`search-workspace ${mobileView === "plan" ? "mobile-hidden" : ""}`}>
        <div className="search-heading"><div><p className="eyebrow">COURSE EXPLORER</p><h2>找一門適合你的課</h2></div><span className="muted">{snapshot.offerings.length.toLocaleString()} 門可查詢</span></div>
        <label className="search-box"><span className="sr-only">課名、課號或教師</span><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg><input aria-label="課名、課號或教師" id="course-search" value={filters.query} placeholder="搜尋課名、課號或教師…" onChange={(event) => changeFilters({ ...filters, query: event.target.value })} />{filters.query && <button aria-label="清除關鍵字" onClick={() => changeFilters({ ...filters, query: "" })}>×</button>}</label>
        <details className="filter-panel"><summary>篩選課程 <span>校區・系所・外校・時段</span></summary><QueryFilters filters={filters} onChange={changeFilters} catalog={catalog} />
          <div className="extra-filters"><label>最低學分<select value={filters.minimumCredits} onChange={(event) => changeFilters({ ...filters, minimumCredits: Number(event.target.value) })}>{[0, 1, 2, 3, 4].map((value) => <option key={value} value={value}>{value ? `至少 ${value} 學分` : "不限"}</option>)}</select></label><label>必選修<select value={filters.requiredType} onChange={(event) => changeFilters({ ...filters, requiredType: event.target.value as CourseSearchFilters["requiredType"] })}><option value="all">不限</option><option value="required">必修</option><option value="elective">選修</option><option value="unknown">未提供</option></select></label></div>
        </details>
        <div className="result-tools"><div><label><input type="checkbox" checked={hideConflicts} onChange={(event) => { setHideConflicts(event.target.checked); setPage(1); }} />只看可排入課表的課</label><label><input type="checkbox" checked={showSaved} onChange={(event) => { setShowSaved(event.target.checked); setPage(1); }} />只看已加入</label></div><button className="text-button" onClick={resetFilters}>重設所有條件</button></div>
        <div className="filter-summary" aria-live="polite">{[filters.department, filters.institution !== "all" ? filters.institution : "", filters.category !== "all" ? filters.category : "", ...campusOptions.filter(([id]) => filters.campuses?.includes(id)).map(([, label]) => label), ...teachingOptions.filter(([id]) => filters.teachingTypes?.includes(id)).map(([, label]) => label), filters.slots?.length ? `${filters.slots.length} 個節次` : ""].filter(Boolean).map((label) => <span key={label}>{label}</span>)}</div>
        <div className="result-heading"><h3 ref={resultHeading} tabIndex={-1} data-testid="result-count">找到 {results.length.toLocaleString()} 門課程</h3><label>排序<select aria-label="結果排序" value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}><option value="courseNo">課程代碼</option><option value="title">課程名稱</option><option value="credits">學分由高至低</option></select></label></div>
        {hideConflicts && <p className="muted small">已排除已知衝堂及時段不完整的課程；跨校交通時間請另行預留。</p>}
        {results.length === 0 ? <div className="empty-state"><h3>沒有符合條件的課程</h3><p>試著減少篩選條件，或確認查詢學期。</p><button onClick={resetFilters}>清除條件，查看所有課程</button></div> : <>
          <div className="course-results">{visible.map((course) => <article className={`course-card ${selectedSet.has(course.courseNo) ? "is-selected" : ""}`} key={course.courseNo} data-course-no={course.courseNo}>
            <div className="course-card-heading"><div><div className="course-code"><span>{schoolLabel(course)}</span> {course.courseNo}</div><h4>{course.title}</h4></div><button disabled={!ready} className={selectedSet.has(course.courseNo) ? "button-added" : "button-add"} aria-label={`${selectedSet.has(course.courseNo) ? "移出" : "加入"} ${course.courseNo} ${course.title}`} onClick={() => toggle(course)}>{selectedSet.has(course.courseNo) ? "✓ 已加入" : "+ 加入"}</button></div>
            <p className="course-meta">{course.instructors.join("、")} <span>·</span> {course.credits} 學分 <span>·</span> {getCourseTypeLabels(course).join(" / ")}</p><p className="course-time">{scheduleLabel(course)}</p><p className="muted small">{getUniqueCourseLocations(course).join("、") || course.sourceLocation || "教室未提供"}</p>
            {conflictIds.has(course.courseNo) && <p className="inline-warning">與目前課表衝堂</p>}{hasIncompleteSchedule(course) && <p className="inline-warning">時段資料不足，無法完整檢查衝堂</p>}
            <details className="course-details"><summary>課程資訊與備註</summary><p>{course.enrollmentText || "選課人數未提供"}（擷取時資料）</p>{course.capacity && <p>本校名額：初選 {course.capacity.preselection ?? "未提供"} / 加退選 {course.capacity.addDrop ?? "未提供"}</p>}{course.sourceSchedule && <p>校方原始時段：{course.sourceSchedule}</p>}<p className="preserve-lines">{course.notes || "校方未提供備註。"}</p><a href="https://querycourse.ntust.edu.tw/QueryCourse/#/" target="_blank" rel="noreferrer">前往官方查詢核對 ↗</a></details>
          </article>)}</div>
          <nav className="pagination" aria-label="課程結果分頁"><button disabled={currentPage === 1} onClick={() => { setPage(currentPage - 1); resultHeading.current?.scrollIntoView({ block: "start" }); }}>上一頁</button><span>第 {currentPage} / {pageCount} 頁</span><button disabled={currentPage === pageCount} onClick={() => { setPage(currentPage + 1); resultHeading.current?.scrollIntoView({ block: "start" }); }}>下一頁</button></nav>
        </>}
      </div>
      <PlanPanel state={state} snapshot={snapshot} planned={planned} mobileHidden={mobileView === "search"} message={message} setMessage={setMessage} toggle={toggle} undo={undo} setUndo={setUndo} setSelection={setSelection} />
    </div>
  </div>;
}
