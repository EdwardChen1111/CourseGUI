"use client";
import { useEffect, useState } from "react";
import catalogData from "@/data/catalog-index.json";
import type { QueryCatalog } from "@/lib/query-options";
import type { CourseSnapshot } from "@/lib/course";
import { courseSnapshotSchema } from "@/lib/course-schema";
import { CoursePlanner } from "@/components/course-planner";

const catalog: QueryCatalog = catalogData;
const cache = new Map<string, CourseSnapshot>();
const yearOf = (semester: string) => semester.slice(0, -1).trim();
const termLabels: Record<string, string> = { "1": "第一學期", "2": "第二學期", H: "暑期" };

export function CourseQuery() {
  const [semester, setSemester] = useState(catalog.semesters[0].semester);
  const [snapshot, setSnapshot] = useState<CourseSnapshot | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const selected = catalog.semesters.find((item) => item.semester === semester)!;
  const availableYears = new Set(catalog.semesters.map((item) => yearOf(item.semester)));
  const years = [...new Set([...catalog.semesters, ...(catalog.unavailableSemesters ?? [])].map((item) => yearOf(item.semester)))].sort((a, b) => Number(b) - Number(a));
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setSnapshot(null);
      setError("");
      try {
        let data = cache.get(semester);
        if (!data) {
          const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/courses/${selected.file}`, { signal: controller.signal });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          data = courseSnapshotSchema.parse(await response.json());
          if (data.semester !== semester) throw new Error("學期資料不符");
          cache.set(semester, data);
        }
        if (!controller.signal.aborted) setSnapshot(data);
      } catch {
        if (!controller.signal.aborted) setError("無法載入此學期資料，請檢查網路後重試。");
      }
    }
    void load();
    return () => controller.abort();
  }, [semester, selected.file, retry]);
  return <>
    <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 pt-8">
      <label>學年度<select aria-label="學年度" className="ml-2 rounded-lg border bg-white p-2" value={yearOf(semester)} onChange={(event) => {
        const candidates = catalog.semesters.filter((item) => yearOf(item.semester) === event.target.value);
        setSemester((candidates.find((item) => item.semester.endsWith(semester.slice(-1))) ?? candidates[0]).semester);
      }}>{years.map((year) => <option key={year} value={year} disabled={!availableYears.has(year)}>{year} 學年度{!availableYears.has(year) ? "（校方資料無法取得）" : ""}</option>)}</select></label>
      <label>學期<select aria-label="學期" className="ml-2 rounded-lg border bg-white p-2" value={semester} onChange={(event) => setSemester(event.target.value)}>{catalog.semesters.filter((item) => yearOf(item.semester) === yearOf(semester)).map((item) => <option key={item.semester} value={item.semester}>{termLabels[item.semester.slice(-1)]}</option>)}</select></label>
      <p className="text-sm text-slate-600">{selected.label} · {selected.count} 門課程；各學期清單獨立保存。</p>
    </div>
    {!!catalog.unavailableSemesters?.length && <details className="mx-auto max-w-6xl px-6 pt-3 text-sm text-amber-800"><summary className="cursor-pointer">{catalog.unavailableSemesters.length} 個歷年學期因官方 API 格式問題無法取得（不是沒有開課）</summary><ul className="mt-2 space-y-1">{catalog.unavailableSemesters.map((item) => <li key={item.semester}>{item.label}：{item.reason} 檢查時間 {item.checkedAt}</li>)}</ul></details>}
    {error ? <p role="alert" className="mx-auto max-w-6xl p-6">{error} <button className="text-sky-700 underline" onClick={() => setRetry((value) => value + 1)}>重新載入</button></p> : snapshot?.semester === semester ? <CoursePlanner key={semester} snapshot={snapshot} catalog={catalog} /> : <p role="status" className="mx-auto max-w-6xl p-6">正在載入完整學期課程…</p>}
  </>;
}
