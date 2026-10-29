"use client";
import { useRef, useState } from "react";
import type { CourseOffering, CourseSnapshot } from "@/lib/course";
import { usePlannerWorkspace } from "@/lib/use-planner-workspace";
import { csvCell, downloadFile, mergeBackup, parseBackup } from "@/lib/planner-workspace";
import { getConflictingMeetings } from "@/lib/schedule";
import { hasIncompleteSchedule, scheduleLabel } from "@/lib/course-display";
import { getUniqueCourseLocations } from "@/lib/course-presentation";
import { ScheduleGrid } from "./schedule-grid";

type Props = { state: ReturnType<typeof usePlannerWorkspace>; snapshot: CourseSnapshot; planned: CourseOffering[]; mobileHidden: boolean; message: string; setMessage: (message: string) => void; toggle: (course: CourseOffering) => void; undo: string[] | null; setUndo: (value: string[] | null) => void; setSelection: (value: string[]) => void };
export function PlanPanel({ state, snapshot, planned, mobileHidden, message, setMessage, toggle, undo, setUndo, setSelection }: Props) {
  const { workspace, update, ready, storageMessage } = state;
  const active = workspace.plans.find((plan) => plan.id === workspace.activeId)!;
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState<"clear" | "delete" | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const missing = active.courseNos.filter((id) => !planned.some((course) => course.courseNo === id));
  const incomplete = planned.filter(hasIncompleteSchedule);
  const conflicts = planned.flatMap((course, index) => planned.slice(index + 1).flatMap((other) => {
    const overlap = getConflictingMeetings(course.meetings, other.meetings);
    return overlap.length ? [{ course, other, overlap }] : [];
  }));
  async function importBackup(file?: File) {
    if (!file) return;
    try {
      if (file.size > 1_000_000) throw new Error("備份檔過大，請使用本工具匯出的 JSON。");
      update(mergeBackup(workspace, parseBackup(JSON.parse(await file.text()), snapshot.semester), () => crypto.randomUUID()));
      setUndo(null); setMessage("已匯入為新方案，原有課表仍保留。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "無法匯入備份。"); }
    if (input.current) input.current.value = "";
  }
  function exportCsv() {
    const rows = [["學期", "課號", "課程", "學分", "教師", "時段", "教室"], ...planned.map((course) => [snapshot.semester, course.courseNo, course.title, course.credits, course.instructors.join("、"), scheduleLabel(course), getUniqueCourseLocations(course).join("、")])];
    downloadFile(`${snapshot.semester}-${active.name}.csv`, "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n"), "text/csv;charset=utf-8");
  }
  return <aside className={`plan-panel ${mobileHidden ? "mobile-hidden" : ""}`} id="my-plan" aria-label="我的課表">
    <div className="plan-title"><div><p className="eyebrow">MY SCHEDULE</p><h2>我的課表</h2></div><span className="credit-badge">{planned.reduce((sum, course) => sum + course.credits, 0)} <small>學分</small></span></div>
    <label className="plan-selector">課表方案<select disabled={!ready} value={workspace.activeId} onChange={(event) => { update({ ...workspace, activeId: event.target.value }); setUndo(null); setConfirm(null); }}>{workspace.plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}（{plan.courseNos.length} 門）</option>)}</select></label>
    <p className="storage-state">{!ready ? "正在讀取儲存的方案…" : storageMessage ? "⚠ 尚未可靠保存" : "● 此裝置自動保存"}</p>
    {storageMessage && <p role="alert" className="notice warning">{storageMessage}</p>}
    <div role="status" className="plan-message">{message}{undo && <button className="text-button" onClick={() => { setSelection(undo); setUndo(null); setMessage("已復原移除操作。"); }}>復原</button>}</div>
    {conflicts.length > 0 ? <div className="notice danger"><strong>{conflicts.length} 組課程衝堂</strong>{conflicts.map(({ course, other, overlap }) => <p key={`${course.courseNo}-${other.courseNo}`}>{course.title} × {other.title}：{[...new Set(overlap.map((meeting) => `${meeting.weekday}${meeting.period}`))].join("、")}</p>)}</div> : planned.length > 0 && !incomplete.length ? <p className="notice success">已知上課時段無衝堂</p> : null}
    {incomplete.length > 0 && <p className="notice warning">{incomplete.length} 門課程時段不完整，不能確認整份課表沒有衝堂。</p>}
    <ScheduleGrid courses={planned} />
    <div className="selected-list">{planned.map((course) => <div className="selected-course" key={course.courseNo}><div><strong>{course.title}</strong><small>{course.courseNo} · {course.credits} 學分</small><small>{scheduleLabel(course)}</small></div><button aria-label={`從課表移除 ${course.courseNo}`} onClick={() => toggle(course)}>×</button></div>)}</div>
    {missing.length > 0 && <div className="notice warning"><strong>目前資料中找不到的已存課程</strong><p>更新後仍保留課號，請核對是否停開。</p>{missing.map((id) => <div key={id}>{id} <button onClick={() => { setUndo(active.courseNos); setSelection(active.courseNos.filter((item) => item !== id)); }}>移除</button></div>)}</div>}
    <div className="plan-actions"><button disabled={!ready} onClick={() => downloadFile(`${snapshot.semester}-課表備份.json`, JSON.stringify(workspace, null, 2))}>下載備份</button><button disabled={!ready} onClick={() => input.current?.click()}>匯入備份</button><button disabled={!planned.length} onClick={exportCsv}>匯出 CSV</button><button disabled={!planned.length} onClick={() => window.print()}>列印課表</button></div>
    <input ref={input} className="sr-only" type="file" accept="application/json,.json" aria-label="匯入課表備份檔案" onChange={(event) => void importBackup(event.target.files?.[0])} />
    <details className="manage-plans"><summary>管理課表方案</summary><label>方案名稱<input maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：方案 B・週五不排課" /></label><div className="plan-actions">
      <button disabled={!ready || !name.trim() || workspace.plans.length >= 20} onClick={() => { const id = crypto.randomUUID(); update({ ...workspace, activeId: id, plans: [...workspace.plans, { id, name: name.trim(), courseNos: [] }] }); setName(""); setUndo(null); setMessage("已建立新的課表方案。"); }}>新增方案</button>
      <button disabled={!ready || !name.trim()} onClick={() => { update({ ...workspace, plans: workspace.plans.map((plan) => plan.id === active.id ? { ...plan, name: name.trim() } : plan) }); setName(""); }}>重新命名</button>
      <button disabled={!active.courseNos.length} onClick={() => setConfirm("clear")}>清空此方案</button><button disabled={workspace.plans.length === 1} onClick={() => setConfirm("delete")}>刪除此方案</button>
    </div>{confirm && <div className="notice warning">確定{confirm === "clear" ? "清空" : "刪除"}「{active.name}」？<div className="plan-actions"><button onClick={() => { if (confirm === "clear") { setUndo(active.courseNos); setSelection([]); setMessage("已清空方案，可復原。"); } else { const plans = workspace.plans.filter((plan) => plan.id !== active.id); update({ ...workspace, plans, activeId: plans[0].id }); setUndo(null); } setConfirm(null); }}>確認{confirm === "clear" ? "清空" : "刪除"}</button><button onClick={() => setConfirm(null)}>取消</button></div></div>}</details>
    <p className="small muted">這是個人排課規劃，不會送出校方選課。跨校節次採校方轉換資料，請預留交通時間。</p>
  </aside>;
}
