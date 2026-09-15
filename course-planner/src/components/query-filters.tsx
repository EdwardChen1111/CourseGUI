"use client";
import { PERIODS, WEEKDAYS } from "@/lib/course";
import type { CourseSearchFilters } from "@/lib/course-search";
import { campusOptions, categoryOptions, teachingOptions, type QueryCatalog } from "@/lib/query-options";

type Props = { filters: CourseSearchFilters; onChange: (filters: CourseSearchFilters) => void; catalog: QueryCatalog };
const inputClass = "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
const dayLabels = ["一", "二", "三", "四", "五", "六", "日"];

export function QueryFilters({ filters, onChange, catalog }: Props) {
  const college = filters.college ?? "";
  const update = (changes: Partial<CourseSearchFilters>) => onChange({ ...filters, ...changes });
  const toggle = (field: "campuses" | "teachingTypes" | "slots", value: string) => {
    const values = filters[field] ?? [];
    update({ [field]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value] });
  };
  return (
    <fieldset className="mt-4 min-w-0 rounded-xl border border-slate-200 bg-white p-4">
      <legend className="px-1 text-sm font-semibold text-slate-700">校方課程查詢條件</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        {([ ["courseNo", "課程代碼"], ["courseName", "課程名稱"], ["instructor", "教師名稱"] ] as const).map(([field, label]) => (
          <label key={field} className="text-sm text-slate-700">{label}<input className={inputClass} value={filters[field] ?? ""} onChange={(event) => update({ [field]: event.target.value })} /></label>
        ))}
        <label className="text-sm text-slate-700">學校<select aria-label="學校" className={inputClass} value={filters.institution ?? "all"} onChange={(event) => update({ institution: event.target.value })}>
          <option value="all">所有學校</option><option value="ntust">台科大（不含校際課程）</option><option value="3">台大與師大</option><option value="3T">台大</option><option value="3N">師大</option>
        </select></label>
        <label className="text-sm text-slate-700">學院<select aria-label="學院" className={inputClass} value={college} onChange={(event) => { const value = event.target.value; update({ college: value, department: "", departmentPrefixes: catalog.departments.filter((item) => item.college === value).map((item) => item.code) }); }}>
          <option value="">所有學院</option>{catalog.colleges.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
        </select></label>
        <label className="text-sm text-slate-700">系所學程<select aria-label="系所學程" className={inputClass} value={filters.department ?? ""} onChange={(event) => update({ department: event.target.value })}>
          <option value="">所有系所</option>{catalog.departments.filter((item) => !college || item.college === college).map((item) => <option key={`${item.college}-${item.code}-${item.name}`} value={item.code}>{item.name}（{item.code}）</option>)}
        </select></label>
        <label className="text-sm text-slate-700">課程類別<select aria-label="課程類別" className={inputClass} value={filters.category ?? "all"} onChange={(event) => update({ category: event.target.value, dimension: "" })}>
          {categoryOptions.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
        </select></label>
        <label className="text-sm text-slate-700">通識向度<select aria-label="通識向度" className={inputClass} value={filters.dimension ?? ""} onChange={(event) => update({ dimension: event.target.value, category: event.target.value ? "general" : filters.category })}>
          <option value="">所有向度</option>{catalog.dimensions.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
        </select></label>
      </div>
      <fieldset className="mt-4"><legend className="text-sm font-semibold">上課校區（可複選）</legend><div className="mt-2 flex flex-wrap gap-4">
        {campusOptions.map(([code, label]) => <label key={code} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={filters.campuses?.includes(code) ?? false} onChange={() => toggle("campuses", code)} />{label}</label>)}
      </div></fieldset>
      <fieldset className="mt-4"><legend className="text-sm font-semibold">其他選項（可複選）</legend><div className="mt-2 flex flex-wrap gap-4">
        {teachingOptions.map(([code, label]) => <label key={code} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={filters.teachingTypes?.includes(code) ?? false} onChange={() => toggle("teachingTypes", code)} />{label}</label>)}
      </div></fieldset>
      <div className="mt-4 flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={filters.onlyMaster ?? false} onChange={(event) => update({ onlyMaster: event.target.checked })} />限研究所課程</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={filters.onlyUndergraduate ?? false} onChange={(event) => update({ onlyUndergraduate: event.target.checked })} />限大學部課程</label>
      </div>
      <details className="mt-4 rounded-lg border border-slate-200 p-3">
        <summary className="cursor-pointer text-sm font-semibold">時間表：已選 {filters.slots?.length ?? 0} 節次</summary>
        <p className="mt-2 text-xs text-slate-600">未選節次時不限時間；選取後列出至少一節符合的課程。勾選「僅列出勾選節次」則整門課所有節次都必須在選取範圍內。</p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <button type="button" className="text-sky-700 underline" onClick={() => update({ slots: WEEKDAYS.flatMap((day) => PERIODS.map((period) => `${day}${period}`)) })}>全選節次</button>
          <button type="button" className="text-sky-700 underline" onClick={() => update({ slots: [] })}>清除節次</button>
          <label className="flex items-center gap-2"><input type="checkbox" checked={filters.onlyListedSlots ?? false} onChange={(event) => update({ onlyListedSlots: event.target.checked })} />僅列出勾選節次</label>
        </div>
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[350px] text-center text-xs"><caption className="sr-only">每週可選上課節次</caption>
          <thead><tr><th scope="col">節次</th>{WEEKDAYS.map((day, index) => <th key={day} scope="col"><button type="button" aria-label={`選取星期${dayLabels[index]}所有節次`} onClick={() => update({ slots: [...new Set([...(filters.slots ?? []), ...PERIODS.map((period) => `${day}${period}`)])] })}>週{dayLabels[index]}</button></th>)}</tr></thead>
          <tbody>{PERIODS.map((period) => <tr key={period}><th scope="row" className="py-2">{period}</th>{WEEKDAYS.map((day, index) => <td key={day}><input type="checkbox" aria-label={`星期${dayLabels[index]}第${period}節`} checked={filters.slots?.includes(`${day}${period}`) ?? false} onChange={() => toggle("slots", `${day}${period}`)} /></td>)}</tr>)}</tbody>
        </table></div>
      </details>
    </fieldset>
  );
}
