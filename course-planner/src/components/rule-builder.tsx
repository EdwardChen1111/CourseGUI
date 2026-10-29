"use client";
import { useState } from "react";
import { requirementSetSchema, type RequirementSet } from "@/lib/requirements";
import type { AcademicData } from "@/lib/academic-records";
type Group = { name: string; credits: string; required: string; eligible: string };
const emptyGroup: Group = { name: "", credits: "0", required: "", eligible: "" };
export function RuleBuilder({ profile, onSave, onCancel }: { profile: AcademicData["profile"]; onSave: (rule: RequirementSet) => void; onCancel: () => void }) {
  const [department, setDepartment] = useState(profile.department);
  const [year, setYear] = useState(profile.entryYear);
  const [category, setCategory] = useState("major");
  const [source, setSource] = useState("");
  const [groups, setGroups] = useState<Group[]>([{ ...emptyGroup }]);
  const [error, setError] = useState("");
  const codes = (text: string) => [...new Set(text.split(/[、,，\s]+/).map((item) => item.trim().toUpperCase()).filter(Boolean))];
  function update(index: number, patch: Partial<Group>) { setGroups(groups.map((group, position) => index === position ? { ...group, ...patch } : group)); }
  return <form className="rule-builder" onSubmit={(event) => {
    event.preventDefault();
    const parsed = requirementSetSchema.safeParse({ id: crypto.randomUUID(), category, departmentCode: department, departmentName: department, entryYear: year, degreeType: profile.degree, version: new Date().toISOString().slice(0, 10), sourceUrl: source, sourceTitle: "個人依公告整理的規劃草稿", sourceRetrievedAt: new Date().toISOString(), reviewStatus: "draft", groups: groups.map((group, index) => {
      const requiredCourseNos = codes(group.required);
      const eligible = codes(group.eligible);
      return { id: String(index), name: group.name, minimumCredits: Number(group.credits), requiredCourseNos, ...(eligible.length ? { creditEligibleCourseNos: [...new Set([...requiredCourseNos, ...eligible])] } : {}) };
    }) });
    if (!parsed.success) { setError("請填妥系所、三位數入學年度、有效來源網址與每個群組的名稱及學分。"); return; }
    if (!/^https?:\/\//.test(source)) { setError("來源必須是 http 或 https 公告網址。"); return; }
    onSave(parsed.data);
  }}>
    <h4>建立個人規則草稿</h4><p className="small muted">依適用的官方科目表整理，儲存後標示為待核對。七碼科目代碼可比對九碼開課班號；其他代碼精確比對。</p>
    <div className="record-form"><label>規則系所名稱<input required value={department} maxLength={100} onChange={(event) => setDepartment(event.target.value)} /></label><label>規則入學年度<input required pattern="[0-9]{3}" maxLength={3} value={year} onChange={(event) => setYear(event.target.value)} /></label><label>規則類別<select aria-label="規則類別" value={category} onChange={(event) => setCategory(event.target.value)}><option value="major">主系</option><option value="double-major">雙主修</option><option value="minor">輔系</option></select></label><label>來源公告網址<input required type="url" value={source} onChange={(event) => setSource(event.target.value)} placeholder="https://…" /></label></div>
    {groups.map((group, index) => <fieldset key={index} className="rule-group"><legend>第 {index + 1} 個群組</legend><div className="record-form"><label>群組名稱<input required maxLength={100} value={group.name} placeholder="例如：系訂必修" onChange={(event) => update(index, { name: event.target.value })} /></label><label>最低群組學分<input required type="number" min="0" max="300" step="0.5" value={group.credits} onChange={(event) => update(index, { credits: event.target.value })} /></label></div><label>必須修過的課號<input value={group.required} placeholder="以逗號或空白分隔" onChange={(event) => update(index, { required: event.target.value })} /></label><label>其他可計入此群組的課號<input value={group.eligible} placeholder="選修課號；留空則只計上方必修" onChange={(event) => update(index, { eligible: event.target.value })} /></label>{groups.length > 1 && <button type="button" onClick={() => setGroups(groups.filter((_, position) => position !== index))}>移除此群組</button>}</fieldset>)}
    {error && <p role="alert" className="notice warning">{error}</p>}<div className="plan-actions"><button type="button" disabled={groups.length >= 20} onClick={() => setGroups([...groups, { ...emptyGroup }])}>新增群組</button><button className="primary-button">儲存規則草稿</button><button type="button" onClick={onCancel}>取消建立</button></div>
  </form>;
}
