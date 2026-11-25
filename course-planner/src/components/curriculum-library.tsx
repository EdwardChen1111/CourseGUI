"use client";

import { useState } from "react";
import { earnedCourses, type AcademicData } from "@/lib/academic-records";
import { allowedSource, categoryLabels, curriculumSources, evaluateSheet, majorQuery, materials, sheets, type Category, type Recognition, type Sheet } from "@/lib/curriculum";

type Props = { data: AcademicData; ready: boolean; save: (data: AcademicData) => void };
const years = [...new Set(curriculumSources.map((source) => source.year))].sort().reverse();
const trackedName = (sheet: Sheet) => `${sheet.year} 材料系${sheet.category === "major" ? "四技" : ""}${categoryLabels[sheet.category]}`;

function RecognitionForm({ sheet, data, save }: { sheet: Sheet } & Omit<Props, "ready">) {
  const [from, setFrom] = useState("");
  const [target, setTarget] = useState("");
  const [credits, setCredits] = useState("");
  const [evidence, setEvidence] = useState("");
  const earned = earnedCourses(data.records).filter((record) => allowedSource(sheet, record.courseNo));
  const decisionList = data.recognitions ?? [];
  const course = earned.find((item) => item.courseNo === from);
  const existing = decisionList.filter((item) => item.sheetId === sheet.id);
  const valid = course && target && credits.trim() !== "" && Number(credits) >= 0 && Number(credits) <= course.credits && evidence.trim();
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
      <label>已通過課號<select value={from} onChange={(e) => { const code = e.target.value; setFrom(code); setCredits(String(earned.find((item) => item.courseNo === code)?.credits ?? "")); }}>
        <option value="">選擇紀錄</option>{earned.map((item) => <option key={item.courseNo}>{item.courseNo}</option>)}</select></label>
      <label>核准抵免科目<select value={target} onChange={(e) => setTarget(e.target.value)}>
        <option value="">選擇科目</option>{sheet.groups.flatMap((group) => group.subjects).map((item) => <option key={item.title}>{item.title}</option>)}</select></label>
      <label>核准學分<input type="number" required step="any" min={0} max={course?.credits ?? 0} value={credits} onChange={(e) => setCredits(e.target.value)} /></label>
      <label>核定依據<input required maxLength={240} placeholder="例如：系辦核定日期與文號" value={evidence} onChange={(e) => setEvidence(e.target.value)} /></label>
      <button disabled={!valid || decisionList.length >= 2000}>儲存認定</button>
    </form> : <p>請先新增符合此表課號限制的已通過修課紀錄。</p>}
  </details>;
}

function SheetProgress({ sheet, data, save }: { sheet: Sheet } & Omit<Props, "ready">) {
  const progress = evaluateSheet(sheet, data.records, data.recognitions);
  const majorMismatch = sheet.category === "major" && (data.profile.entryYear !== sheet.year ||
    !["TX", "材料系", "材料科學與工程系", "工程學院材料系"].includes(data.profile.department.trim().toUpperCase().replaceAll(" ", "")));
  function remove() {
    if (data.recognitions?.some((entry) => entry.sheetId === sheet.id) &&
      !window.confirm("移除這份科目表也會刪除所登錄的抵免依據。確定移除？")) return;
    save({ ...data, trackedSheets: data.trackedSheets?.filter((id) => id !== sheet.id),
      recognitions: data.recognitions?.filter((item) => item.sheetId !== sheet.id) });
  }
  return <article className="tracked-sheet">
    <div className="result-heading"><h5>{trackedName(sheet)}</h5><button type="button" onClick={remove}>移除追蹤及認定</button></div>
    <a href={sheet.url} target="_blank" rel="noreferrer">{sheet.category === "major" ? "開啟主系查詢，選該年度／四技／材料系" : "查看教務處原表（表內第 2 頁）"} ↗</a>
    {data.profile.degree !== "undergraduate" || majorMismatch ? <div className="notice warning">
      <p>請核對個人設定。此表適用大學部{sheet.category === "major" ? `、${sheet.year} 入學的材料系四技學生` : "學生"}。</p>
      {sheet.category === "major" && <button type="button" onClick={() => save({
        ...data, profile: { entryYear: sheet.year, department: materials, degree: "undergraduate" },
      })}>將個人設定改為 {sheet.year} 入學、材料系大學部</button>}
    </div> :
    <>
      <p className="small muted">2026-11-25 依校方原表整理。課號對照本校開課紀錄，可展開各組查看採計的科目及課號。</p>
      {sheet.conditions.map((note) => <p className="small muted" key={note}>{note}</p>)}
      {progress.map((group) => <details key={group.label} className="sheet-group">
        <summary>{group.label} · {group.achieved} / {group.minimum} {group.mode === "credits" ? "學分" : "科"}{group.complete ? " ✓" : ""}</summary>
        <ul>{group.rows.map((row) => <li key={row.title}>
          <span>{row.passed ? "已通過" : row.credited > 0 ? "學分不足" : "待修"} · {row.title}
          {row.credits > 0 && `（${row.credited}/${row.credits} 學分）`}</span>
          <small>{row.codes.join("、") || "課號待核對，可依核定結果登錄"}</small>
        </li>)}</ul>
      </details>)}
      <RecognitionForm sheet={sheet} data={data} save={save} />
    </>}
  </article>;
}

export function CurriculumLibrary({ data, ready, save }: Props) {
  const [selectedYear, setSelectedYear] = useState("");
  const [category, setCategory] = useState<Category>("minor");
  const [departmentChoice, setDepartmentChoice] = useState("");
  const year = selectedYear || (years.includes(data.profile.entryYear) ? data.profile.entryYear : years[0]);
  const source = curriculumSources.find((item) => item.year === year && item.category === category);
  const departments = source?.departments ?? [];
  const department = departments.find((item) => item.name === departmentChoice) ?? departments.find((item) => item.name === materials);
  const sheet = sheets.find((item) => item.year === year && item.category === category && (category === "major" || department?.name === materials));
  const tracked = data.trackedSheets ?? [];
  const url = category === "major" ? majorQuery : source?.url + (department ? "#page=" + department.page : "");
  return <section className="curriculum-library" aria-label="校方科目表">
    <h4>校方科目表</h4>
    <div className="library-inputs">
      <label>科目表年度<select value={year} onChange={(e) => setSelectedYear(e.target.value)}>{years.map((y) => <option key={y}>{y}</option>)}</select></label>
      <label>科目表類別<select value={category} onChange={(e) => setCategory(e.target.value as Category)}>{Object.entries(categoryLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      {departments.length > 0 && <label>查閱系所<select value={department?.name ?? ""} onChange={(e) => setDepartmentChoice(e.target.value)}>{departments.map((d) => <option key={d.name}>{d.name}</option>)}</select></label>}
    </div>
    <p><a href={url} target="_blank" rel="noreferrer">{category === "major" ? "依年度、年制與系所查主系必修表" : department ? `開啟${department.name}原表（PDF 第 ${department.page} 頁）` : `開啟 ${year} 學年度各系原表`} ↗</a></p>
    {department?.closed && <p>本年度此學程已停止受理新申請，原表列有適用說明。</p>}
    {sheet ? <div className="library-track"><strong>{trackedName(sheet)}</strong>
      <p className="small muted">{category === "major" ? "請確認個人設定中的入學年度與主系，並核對年制為四技。" : "請依自己的核准資料選擇適用的科目表年度。"}</p>
      <button type="button" disabled={!ready || tracked.includes(sheet.id) || tracked.length >= 30} onClick={() => save({ ...data, trackedSheets: [...tracked, sheet.id] })}>{tracked.includes(sheet.id) ? "已加入追蹤" : "追蹤這份科目表"}</button>
    </div> : <p className="small muted">此選項提供校方原表。需要計算進度時，可依原表建立個人規則。</p>}
    {tracked.map((id) => { const item = sheets.find((s) => s.id === id); return item ? <SheetProgress sheet={item} data={data} save={save} key={id}/> : <p key={id}>此備份的科目表版本暫無法載入（{id}）。</p>; })}
  </section>;
}
