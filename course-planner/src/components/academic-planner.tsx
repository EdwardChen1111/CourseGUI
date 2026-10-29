"use client";
import { useEffect, useRef, useState } from "react";
import { ACADEMIC_KEY, academicProgress, academicSchema, earnedCourses, emptyAcademic, type AcademicData } from "@/lib/academic-records";
import { requirementSetSchema } from "@/lib/requirements";
import { downloadFile } from "@/lib/planner-workspace";
import { RuleBuilder } from "./rule-builder";

export function AcademicPlanner() {
  const [data, setData] = useState<AcademicData>(emptyAcademic);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [storageError, setStorageError] = useState("");
  const [blockedWrite, setBlockedWrite] = useState(false);
  const [buildingRule, setBuildingRule] = useState(false);
  const [record, setRecord] = useState({ courseNo: "", title: "", credits: "3", semester: "", status: "passed" as "passed" | "taking" | "failed" });
  const ruleInput = useRef<HTMLInputElement>(null);
  const backupInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      try { const saved = localStorage.getItem(ACADEMIC_KEY); if (saved) setData(academicSchema.parse(JSON.parse(saved))); }
      catch { setBlockedWrite(true); setStorageError("無法讀取修課紀錄，原始資料未被覆寫。請先確認備份。"); }
      setReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  function save(next: AcademicData) {
    setData(next);
    if (blockedWrite) { setStorageError("原始紀錄無法讀取，因此未覆寫。請下載目前資料備份。"); return; }
    try { localStorage.setItem(ACADEMIC_KEY, JSON.stringify(next)); setStorageError(""); }
    catch { setStorageError("無法在此瀏覽器保存，請先下載備份。"); }
  }
  async function importFile(file: File | undefined, kind: "rule" | "backup") {
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error("檔案超過 2 MB，請確認匯入檔案。");
      const value: unknown = JSON.parse(await file.text());
      if (kind === "rule") {
        const rule = requirementSetSchema.parse(value);
        if (rule.reviewStatus === "demo") throw new Error("這是展示規則，請匯入適用年度與科系的規則檔。");
        if (data.requirements.some((item) => item.id === rule.id)) throw new Error("相同規則已匯入，請先移除舊規則。");
        if (data.requirements.length >= 20) throw new Error("最多保留 20 份規則。");
        save({ ...data, requirements: [...data.requirements, rule] });
        setMessage(`已匯入 ${rule.departmentName} ${rule.entryYear} 入學年度規則。`);
      } else {
        const imported = academicSchema.parse(value);
        if (data.records.length || data.requirements.length) throw new Error("為避免覆寫現有紀錄，完整備份請匯入尚未建立修課資料的瀏覽器。");
        save(imported); setMessage("已還原修課資料。");
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "檔案格式無法辨識。"); }
    if (ruleInput.current) ruleInput.current.value = "";
    if (backupInput.current) backupInput.current.value = "";
  }
  const earned = earnedCourses(data.records);
  const categories = { major: "主系", "double-major": "雙主修", minor: "輔系" };
  return <section className="academic-workspace" aria-label="修課紀錄與規則">
    <div className="academic-intro"><p className="eyebrow">LEARNING RECORD</p><h2>從你的修課紀錄開始</h2><p>記錄已通過的課程，依適用的主系、雙主修與輔系規則檢視缺修項目。候選課表不會自動算入已修學分。</p></div>
    {storageError && <p role="alert" className="notice warning">{storageError}</p>}<p role="status">{message}</p>
    <fieldset disabled={!ready} className="profile-fields"><legend>個人修課設定</legend><label>入學年度<input inputMode="numeric" maxLength={3} placeholder="例如 113" value={data.profile.entryYear} onChange={(event) => { const year = event.target.value; if (/^\d{0,3}$/.test(year)) save({ ...data, profile: { ...data.profile, entryYear: year } }); }} /></label><label>系所名稱<input value={data.profile.department} maxLength={100} placeholder="輸入你的主系" onChange={(event) => save({ ...data, profile: { ...data.profile, department: event.target.value } })} /></label><label>學制<select value={data.profile.degree} onChange={(event) => save({ ...data, profile: { ...data.profile, degree: event.target.value as "undergraduate" | "master" } })}><option value="undergraduate">大學部</option><option value="master">研究所</option></select></label></fieldset>
    <div className="academic-grid"><section className="academic-card"><div className="result-heading"><h3>修課紀錄</h3><strong>{earned.reduce((total, item) => total + item.credits, 0)} 已通過學分</strong></div><p className="small muted">相同科目重修只計一次；修讀中與未通過的課程不計入。</p>
      <form className="record-form" onSubmit={(event) => { event.preventDefault(); try { const item = { ...record, id: crypto.randomUUID(), credits: Number(record.credits) }; const next = academicSchema.parse({ ...data, records: [...data.records, item] }); save(next); setRecord({ ...record, courseNo: "", title: "" }); setMessage("已新增修課紀錄。"); } catch { setMessage("請填寫有效的課號、名稱與學分。"); } }}>
        <label>課程代碼<input required maxLength={40} value={record.courseNo} onChange={(event) => setRecord({ ...record, courseNo: event.target.value })} /></label>
        <label>課程名稱<input required maxLength={200} value={record.title} onChange={(event) => setRecord({ ...record, title: event.target.value })} /></label>
        <label>學分<input type="number" min="0" max="30" step="0.5" required value={record.credits} onChange={(event) => setRecord({ ...record, credits: event.target.value })} /></label>
        <label>修課學期<input maxLength={10} placeholder="例如 1131" value={record.semester} onChange={(event) => setRecord({ ...record, semester: event.target.value })} /></label>
        <div><label htmlFor="record-status">修課結果</label><select id="record-status" aria-label="修課結果" value={record.status} onChange={(event) => setRecord({ ...record, status: event.target.value as typeof record.status })}><option value="passed">已通過</option><option value="taking">修讀中</option><option value="failed">未通過</option></select></div>
        <button className="primary-button" disabled={!ready}>新增紀錄</button>
      </form>
      {data.records.length === 0 && <p className="empty-state">尚未建立紀錄。請依成績單填寫已修課程。</p>}
      <div className="selected-list">{data.records.map((item) => <div className="selected-course" key={item.id}><div><strong>{item.title}</strong><small>{item.courseNo} · {item.credits} 學分 · {item.semester}</small><small>{{ passed: "已通過", taking: "修讀中", failed: "未通過" }[item.status]}</small></div><button aria-label={`刪除紀錄 ${item.courseNo}`} onClick={() => save({ ...data, records: data.records.filter((row) => row.id !== item.id) })}>×</button></div>)}</div>
      <div className="plan-actions"><button disabled={!ready} onClick={() => downloadFile("修課資料備份.json", JSON.stringify(data, null, 2))}>備份修課資料</button><button disabled={!ready} onClick={() => backupInput.current?.click()}>還原修課資料</button></div><input className="sr-only" type="file" ref={backupInput} aria-label="修課資料備份檔案" accept=".json" onChange={(event) => void importFile(event.target.files?.[0], "backup")} />
    </section><section className="academic-card"><div className="result-heading"><h3>主系・雙主修・輔系</h3><button disabled={!ready} onClick={() => ruleInput.current?.click()}>匯入規則</button></div><input className="sr-only" type="file" ref={ruleInput} aria-label="修課規則檔案" accept=".json" onChange={(event) => void importFile(event.target.files?.[0], "rule")} />
      {data.requirements.length === 0 && !buildingRule && <div className="empty-state"><h4>尚未匯入適用規則</h4><p>目前沒有經核對的各系完整規則庫。你可以依官方科目表建立個人草稿，或匯入附來源與入學年度的規則檔。</p></div>}
      <p className="small muted">目前逐群組檢查列出的課號；群組間學分重複採計、抵免及替代課程，請依校方規定另行核對。</p>
      {!buildingRule && <button disabled={!ready || data.requirements.length >= 20} onClick={() => setBuildingRule(true)}>建立個人規則草稿</button>}
      {buildingRule && <RuleBuilder profile={data.profile} onCancel={() => setBuildingRule(false)} onSave={(rule) => { save({ ...data, requirements: [...data.requirements, rule] }); setBuildingRule(false); setMessage("已建立規則草稿，請依官方公告核對。"); }} />}
      {data.requirements.map((rule) => { const mismatch = rule.entryYear !== data.profile.entryYear || rule.degreeType !== data.profile.degree; return <article className="rule-card" key={rule.id}><div className="result-heading"><h4>{rule.departmentName} · {categories[rule.category]}</h4><button aria-label={`移除規則 ${rule.id}`} onClick={() => save({ ...data, requirements: data.requirements.filter((item) => item.id !== rule.id) })}>移除</button></div><p className="small">{rule.entryYear} 入學年度 · {rule.degreeType === "undergraduate" ? "大學部" : "研究所"} · {rule.reviewStatus === "reviewed" ? "匯入檔標示已審核" : "草稿，待核對"}</p><a href={/^https?:\/\//.test(rule.sourceUrl) ? rule.sourceUrl : undefined} target="_blank" rel="noreferrer">{rule.sourceTitle} ↗</a>{mismatch ? <p className="notice warning">入學年度或學制與你的設定不符，未套用計算。</p> : academicProgress(rule, data.records).map((group) => <div key={group.id} className="rule-progress"><strong>{group.name}</strong><span>{group.credits} / {group.minimumCredits} 學分</span><progress value={Math.min(group.credits, group.minimumCredits)} max={Math.max(1, group.minimumCredits)} /><p>{group.missing.length ? `尚缺：${group.missing.join("、")}` : group.complete ? "依此規則已達標" : "必修科目已齊，學分仍不足"}</p></div>)}</article>; })}
      <div className="source-links"><strong>官方規則來源</strong><a href="https://dss20.ntust.edu.tw/edua/list/lst_eduneed.aspx" target="_blank" rel="noreferrer">各系必修科目表 ↗</a><a href="https://demoadmin.ntust.edu.tw/var/file/48/1048/img/2790/T-DOUBLE.pdf" target="_blank" rel="noreferrer">雙主修科目表 ↗</a><a href="https://demoadmin.ntust.edu.tw/var/file/48/1048/img/2790/T-MINOR.pdf" target="_blank" rel="noreferrer">輔系科目表 ↗</a><a href="https://github.com/EdwardChen1111/CourseGUI/blob/main/course-planner/docs/REQUIREMENT_REVIEW.md" target="_blank" rel="noreferrer">規則檔格式與核對方式 ↗</a></div><p className="small muted">本機自行記錄及匯入資料，正式抵免與畢業認定仍由校方審核。</p>
    </section></div>
  </section>;
}
