"use client";

import { useState } from "react";
import { earnedCourses, type AcademicData } from "@/lib/academic-records";
import { allowedSource, eligibleTarget, fitsDepartment, categoryLabels, curriculumSources, evaluateSheet, majorQuery, sheets, type Category, type Recognition, type Sheet } from "@/lib/curriculum";

type Props = { data: AcademicData; ready: boolean; save: (data: AcademicData) => void };
const years = [...new Set(curriculumSources.map((source) => source.year))].sort().reverse();
const trackedName = (sheet: Sheet) => `${sheet.year} ${sheet.shortName}${sheet.category === "major" ? "四技" : ""}${categoryLabels[sheet.category]}`;

function RecognitionForm({ sheet, data, save }: { sheet: Sheet } & Omit<Props, "ready">) {
  const [from, setFrom] = useState("");
  const [target, setTarget] = useState("");
  const [credits, setCredits] = useState("");
  const [evidence, setEvidence] = useState("");
  const earned = earnedCourses(data.records).filter((record) => allowedSource(sheet, record.courseNo));
  const decisionList = data.recognitions ?? [];
  const course = earned.find((item) => item.courseNo === from);
  const existing = decisionList.filter((item) => item.sheetId === sheet.id);
  const targets = [...new Set(sheet.groups.flatMap((group) => [
    ...group.subjects.flatMap((item) => [item.title, ...(item.alternatives ?? []).flatMap((route) => route.map((part) => part.title))]),
    ...(group.manual && eligibleTarget(group, from) ? [group.manual.target, ...(group.manual.alternativeTarget ? [group.manual.alternativeTarget] : [])] : []),
  ]))];
  const valid = course && targets.includes(target) && credits.trim() !== "" && Number(credits) >= 0 && Number(credits) <= course.credits && evidence.trim();
  function store() {
    if (!valid) return;
    const remaining = decisionList.filter((item) => item.sheetId !== sheet.id || item.fromCode !== from);
    const decision: Recognition = { sheetId: sheet.id, fromCode: from, target, credits: Number(credits), evidence: evidence.trim() };
    save({ ...data, recognitions: [...remaining, decision] });
    setFrom(""); setTarget(""); setCredits(""); setEvidence("");
  }
  return <details className="recognition"><summary>登錄已核准的抵免或替代課程</summary>
    <p>依系所核定結果填寫。每個原課號在這份表只採計一次，採計學分上限為已通過及科目表所列學分。</p>
    <ul>{existing.map((entry) => <li key={entry.fromCode}>
      {entry.fromCode} → {entry.target}（{entry.credits} 學分）· {entry.evidence}
      <button type="button" onClick={() => save({ ...data, recognitions: decisionList.filter((item) => item !== entry) })}>移除這筆認定</button>
    </li>)}</ul>
    {earned.length ? <form onSubmit={(e) => { e.preventDefault(); store(); }}>
      <label>已通過課號<select value={from} onChange={(e) => { const code = e.target.value; setFrom(code); setTarget(""); setCredits(String(earned.find((item) => item.courseNo === code)?.credits ?? "")); }}>
        <option value="">選擇紀錄</option>{earned.map((item) => <option key={item.courseNo}>{item.courseNo}</option>)}</select></label>
      <label>核准抵免科目<select value={target} onChange={(e) => setTarget(e.target.value)}>
        <option value="">選擇科目</option>{targets.map((title) => <option key={title}>{title}</option>)}</select></label>
      <label>核准學分<input type="number" required step="any" min={0} max={course?.credits ?? 0} value={credits} onChange={(e) => setCredits(e.target.value)} /></label>
      <label>核定依據<input required maxLength={240} placeholder="例如：系辦核定日期與文號" value={evidence} onChange={(e) => setEvidence(e.target.value)} /></label>
      <button disabled={!valid || decisionList.length >= 2000}>儲存認定</button>
    </form> : <p>請先新增符合此表課號限制的已通過修課紀錄。</p>}
  </details>;
}

function SheetProgress({ sheet, data, save, preview = false }: { sheet: Sheet; preview?: boolean } & Omit<Props, "ready">) {
  const progress = evaluateSheet(sheet, data.records, data.recognitions);
  const majorMismatch = sheet.category === "major" && (data.profile.entryYear !== sheet.year ||
    !fitsDepartment(sheet, data.profile.department));
  function remove() {
    if (data.recognitions?.some((entry) => entry.sheetId === sheet.id) &&
      !window.confirm("移除這份科目表也會刪除所登錄的抵免依據。確定移除？")) return;
    save({ ...data, trackedSheets: data.trackedSheets?.filter((id) => id !== sheet.id),
      recognitions: data.recognitions?.filter((item) => item.sheetId !== sheet.id) });
  }
  return <article className={preview ? "sheet-preview" : "tracked-sheet"}>
    <div className="result-heading"><h5>{trackedName(sheet)}{preview ? " · 進度預覽" : ""}</h5>{!preview && <button type="button" onClick={remove}>移除追蹤及認定</button>}</div>
    <a href={sheet.url} target="_blank" rel="noreferrer">{sheet.category === "major" ? `查閱 ${sheet.year} 學年度四技${sheet.department}必修表` : `查看教務處原表（PDF 第 ${sheet.page} 頁）`} ↗</a>
    {sheet.supplementUrl && <p><a href={sheet.supplementUrl} target="_blank" rel="noreferrer">查閱學程修業規定 ↗</a></p>}
    {(data.profile.degree !== "undergraduate" || majorMismatch) && <div className="notice warning">
      <p>以下依所選科目表試算。此表適用大學部{sheet.category === "major" ? `、${sheet.year} 入學的${sheet.department}四技學生` : "學生"}。</p>
      {sheet.category === "major" && <button type="button" onClick={() => save({
        ...data, profile: { entryYear: sheet.year, department: sheet.department, degree: "undergraduate" },
      })}>將個人設定改為 {sheet.year} 入學、{sheet.shortName}大學部</button>}
    </div>}
    <>
      <p className="small muted">依 {sheet.year} 學年度校方原表整理。課號對照本校開課紀錄，可展開各組查看採計的科目及課號。</p>
      {sheet.conditions.length > 0 && <details className="sheet-notes"><summary>適用條件與先修說明</summary>{sheet.conditions.map((note) => <p className="small muted" key={note}>{note}</p>)}</details>}
      {progress.map((group) => <details key={group.label} className="sheet-group">
        <summary>{group.label} · {group.achieved} / {group.minimum} {group.mode === "credits" ? "學分" : "科"}{group.complete ? " ✓" : group.mode === "credits" ? ` · 尚缺 ${group.remaining} 學分` : ` · 尚缺 ${group.remaining} 科${group.missingCredits ? `（至少 ${group.missingCredits} 學分）` : ""}`}{group.minAreas && ` · 已修 ${group.areas} / ${group.minAreas} 個領域`}</summary>
        {group.manual && <p className="small">此組已採計 {group.confirmed} {group.mode === "subjects" ? "科" : "學分"}來自開放科目。{preview ? "加入追蹤後可登錄" : "可在下方登錄"}「{group.manual.target}」{group.manual.alternativeTarget && `或「${group.manual.alternativeTarget}」，依同一路徑累計`}。</p>}
        <ul>{group.rows.map((row) => <li key={row.title}>
          <span>{row.passed ? "已通過" : row.credited > 0 ? (row.alternatives ? "組合尚未修齊" : "學分不足") : group.mode === "all" ? "待修" : "可選"} · {row.title}
          {row.actual ? `（採計 ${row.credited} 學分）` : row.credits > 0 && `（${row.credited}/${row.credits} 學分）`}</span>
          {row.routes.map((route) => <small key={route.map((s) => s.title).join("+")}>組合：{route.map((s) => `${s.passed ? "已通過" : "待修"} ${s.title}`).join(" ＋ ")}</small>)}
          {row.pairedWith && <small>須搭配通過：{row.pairedWith.join(" 或 ")}</small>}
          {(row.codes.length > 0 || !row.alternatives) && <small>{row.codes.join("、") || "課號待核對，可依核定結果登錄"}</small>}
        </li>)}</ul>
      </details>)}
      {!preview && <RecognitionForm sheet={sheet} data={data} save={save} />}
    </>
  </article>;
}

export function CurriculumLibrary({ data, ready, save }: Props) {
  const [selectedYear, setSelectedYear] = useState("");
  const [category, setCategory] = useState<Category>("minor");
  const [departmentChoice, setDepartmentChoice] = useState("");
  const year = selectedYear || (years.includes(data.profile.entryYear) ? data.profile.entryYear : years[0]);
  const source = curriculumSources.find((item) => item.year === year && item.category === category);
  const available = sheets.filter((item) => item.year === year && item.category === category);
  const departments = category === "major" ? available.map((item) => ({ name: item.department, closed: false, page: 0 })) : source?.departments ?? [];
  const profileChoice = available.find((item) => fitsDepartment(item, data.profile.department))?.department;
  const preferred = departmentChoice || profileChoice || (category === "major" ? data.profile.department.trim() : "");
  const department = preferred ? departments.find((item) => item.name === preferred) : departments[0];
  const sheet = available.find((item) => item.department === department?.name);
  const tracked = data.trackedSheets ?? [];
  const url = category === "major" ? majorQuery : (source?.url ?? majorQuery) + (department ? "#page=" + department.page : "");
  return <section className="curriculum-library" aria-label="校方科目表">
    <h4>校方科目表</h4>
    <div className="library-inputs">
      <label>科目表年度<select value={year} onChange={(e) => setSelectedYear(e.target.value)}>{years.map((y) => <option key={y}>{y}</option>)}</select></label>
      <label>科目表類別<select value={category} onChange={(e) => setCategory(e.target.value as Category)}>{Object.entries(categoryLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      {departments.length > 0 && <label>查閱系所<select value={department?.name ?? ""} onChange={(e) => setDepartmentChoice(e.target.value)}>{!department && <option value="">請選擇適用系所或組別</option>}{departments.map((d) => <option key={d.name} value={d.name}>{d.name}{d.closed ? "（停止受理）" : ""}</option>)}</select></label>}
    </div>
    <p><a href={url} target="_blank" rel="noreferrer">{category === "major" ? "依年度、年制與系所查主系必修表" : department ? `開啟${department.name}原表（PDF 第 ${department.page} 頁）` : `開啟 ${year} 學年度各系原表`} ↗</a></p>
    {department?.closed && <p>本年度此學程已停止受理新申請，原表列有適用說明。</p>}
    {sheet ? <div className="library-track">
      <p className="small muted">{category === "major" ? "請確認個人設定中的入學年度與主系，並核對年制為四技。" : "請依自己的核准資料選擇適用的科目表年度。"}</p>
      <button type="button" disabled={!ready || tracked.includes(sheet.id) || tracked.length >= 30} onClick={() => save({ ...data, trackedSheets: [...tracked, sheet.id] })}>{tracked.includes(sheet.id) ? "已加入追蹤" : "追蹤這份科目表"}</button>
    </div> : !department?.closed && <p className="small muted">{!department && preferred && departments.length ? `「${preferred}」在此年度與類別沒有對應的科目表，請重新選擇適用系所或組別。` : "此選項提供校方原表。需要計算進度時，可依原表建立個人規則。"}</p>}
    {sheet && !tracked.includes(sheet.id) && <SheetProgress key={sheet.id} sheet={sheet} data={data} save={save} preview />}
    {tracked.map((id) => { const item = sheets.find((s) => s.id === id); return item ? <SheetProgress sheet={item} data={data} save={save} key={id}/> : <p key={id}>此備份的科目表版本暫無法載入（{id}）。</p>; })}
  </section>;
}
