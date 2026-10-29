"use client";
import { useEffect, useState } from "react";
import catalogData from "@/data/catalog-index.json";
import type { QueryCatalog } from "@/lib/query-options";
import type { CourseSnapshot } from "@/lib/course";
import { courseSnapshotSchema } from "@/lib/course-schema";
import { CoursePlanner } from "@/components/course-planner";
import { AcademicPlanner } from "@/components/academic-planner";

const catalog: QueryCatalog = catalogData;
const cache = new Map<string, CourseSnapshot>();
const yearOf = (semester: string) => semester.slice(0, -1).trim();
const termLabels: Record<string, string> = { "1": "第一學期", "2": "第二學期", H: "暑期" };
const PREF_KEY = "ntust:last-semester";
export function CourseQuery() {
  const [semester, setSemester] = useState("");
  const [view, setView] = useState("planner");
  const [snapshot, setSnapshot] = useState<CourseSnapshot | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [today, setToday] = useState(0);
  const selected = catalog.semesters.find((item) => item.semester === semester);
  const availableYears = new Set(catalog.semesters.map((item) => yearOf(item.semester)));
  const years = [...new Set([...catalog.semesters, ...(catalog.unavailableSemesters ?? [])].map((item) => yearOf(item.semester)))].sort((a, b) => Number(b) - Number(a));
  useEffect(() => {
    const timer = setTimeout(() => {
      let saved = "";
      try { saved = localStorage.getItem(PREF_KEY) ?? ""; } catch { /* URL still works without browser storage. */ }
      const requested = new URLSearchParams(window.location.search).get("semester") || saved;
      setSemester(catalog.semesters.some((item) => item.semester === requested) ? requested : catalog.semesters[0].semester);
      setToday(Date.now());
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    const file = selected.file;
    async function load() {
      setError("");
      try {
        let data = cache.get(semester);
        if (!data) {
          const response = await fetch((process.env.NEXT_PUBLIC_BASE_PATH ?? "") + "/courses/" + file + "?v=" + encodeURIComponent(catalog.retrievedAt), { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]) });
          if (!response.ok) throw new Error("HTTP " + response.status);
          data = courseSnapshotSchema.parse(await response.json());
          if (data.semester !== semester) throw new Error("學期資料不符");
          cache.set(semester, data);
        }
        if (!controller.signal.aborted) setSnapshot(data);
      } catch {
        if (!controller.signal.aborted) setError("此學期資料暫時載入失敗。請檢查網路或重新載入。");
      }
    }
    void load();
    return () => controller.abort();
  }, [semester, selected, retry]);
  function choose(value: string) {
    setSemester(value);
    try { localStorage.setItem(PREF_KEY, value); } catch { /* The current session remains usable. */ }
    const url = new URL(window.location.href); url.searchParams.set("semester", value); window.history.replaceState(null, "", url);
  }
  const current = snapshot?.semester === semester ? snapshot : null;
  const age = current && today ? Math.max(0, Math.floor((today - Date.parse(current.retrievedAt)) / 86400000)) : 0;
  return <>
    <nav className="workspace-tabs" aria-label="主要功能"><button aria-current={view === "planner" ? "page" : undefined} onClick={() => setView("planner")}>查課與排課</button><button aria-current={view === "records" ? "page" : undefined} onClick={() => setView("records")}>修課紀錄與規則</button></nav>
    <div hidden={view !== "planner"} id="planner">
      <div className="semester-bar"><div className="semester-controls"><label>學年度<select aria-label="學年度" disabled={!selected} value={yearOf(semester)} onChange={(event) => {
        const candidates = catalog.semesters.filter((item) => yearOf(item.semester) === event.target.value);
        choose((candidates.find((item) => item.semester.endsWith(semester.slice(-1))) ?? candidates[0]).semester);
      }}>{!selected && <option value="">載入中</option>}{years.map((year) => <option key={year} value={year} disabled={!availableYears.has(year)}>{year} 學年度{!availableYears.has(year) ? "（來源暫不可用）" : ""}</option>)}</select></label>
      <label>學期<select aria-label="學期" disabled={!selected} value={semester} onChange={(event) => choose(event.target.value)}>{catalog.semesters.filter((item) => yearOf(item.semester) === yearOf(semester)).map((item) => <option key={item.semester} value={item.semester}>{termLabels[item.semester.slice(-1)]}</option>)}</select></label></div>
      <div className="data-status">{current ? <><span className={age > 7 ? "age-warning" : ""}>資料更新：{new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium", timeZone: "Asia/Taipei" }).format(new Date(current.retrievedAt))}{age > 7 ? " · " + age + " 天前" : ""}</span><small>選課人數為更新當時資料；最新名額請至校方確認。</small></> : <span>各學期課表分開保存</span>}</div></div>
      {age > 7 && <p className="notice warning freshness-note">這份資料已有 {age} 天未更新，開課、時段及人數可能變動。請先核對官方資料再決定選課。</p>}
      {error ? <div role="alert" className="empty-state"><h2>暫時無法載入課程</h2><p>{error}</p><button onClick={() => setRetry((value) => value + 1)}>重新載入</button></div> : current ? <CoursePlanner key={semester} snapshot={current} catalog={catalog} /> : <p role="status" className="loading-state">正在讀取學期課程與你的課表…</p>}
      {!!catalog.unavailableSemesters?.length && <details className="unavailable-details"><summary>歷年資料可用範圍</summary><p>目前可查詢 {catalog.semesters.length} 個學期。下列 {catalog.unavailableSemesters.length} 個學期曾無法從校方取得，這不表示沒有開課：</p><p>{catalog.unavailableSemesters.map((item) => item.semester).join("、")}</p><p className="small muted">最近核對：{catalog.unavailableSemesters[0].checkedAt.slice(0, 10)}。各系規則及正式選課請依官方公告。</p></details>}
    </div>
    {view === "records" && <AcademicPlanner />}
  </>;
}
