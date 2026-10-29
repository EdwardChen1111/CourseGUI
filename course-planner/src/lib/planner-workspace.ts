import { z } from "zod";

export const workspaceSchema = z.object({
  version: z.literal(2),
  semester: z.string().regex(/^\d{2,3}\s?[12H]$/),
  activeId: z.string().min(1),
  plans: z.array(z.object({ id: z.string().min(1), name: z.string().trim().min(1).max(60), courseNos: z.array(z.string().min(1).max(40)).max(200) })).min(1).max(20),
}).superRefine((value, context) => {
  if (new Set(value.plans.map((plan) => plan.id)).size !== value.plans.length || !value.plans.some((plan) => plan.id === value.activeId)) {
    context.addIssue({ code: "custom", message: "課表識別資料不完整" });
  }
});
export type PlannerWorkspace = z.infer<typeof workspaceSchema>;
export const workspaceKey = (semester: string) => `ntust:plans:v2:${semester}`;
export function createWorkspace(semester: string, courseNos: string[] = []): PlannerWorkspace {
  return { version: 2, semester, activeId: "default", plans: [{ id: "default", name: "我的課表", courseNos: [...new Set(courseNos)] }] };
}
export function parseBackup(value: unknown, semester: string): PlannerWorkspace {
  const parsed = workspaceSchema.parse(value);
  if (parsed.semester !== semester) throw new Error(`這份備份屬於 ${parsed.semester} 學期，請先切換學期再匯入。`);
  return { ...parsed, plans: parsed.plans.map((plan) => ({ ...plan, courseNos: [...new Set(plan.courseNos)] })) };
}
export function mergeBackup(current: PlannerWorkspace, incoming: PlannerWorkspace, id: () => string): PlannerWorkspace {
  if (current.semester !== incoming.semester) throw new Error("學期不符");
  if (current.plans.length + incoming.plans.length > 20) throw new Error("每學期最多 20 個方案，請先移除不需要的方案。");
  const imported = incoming.plans.map((plan) => ({ ...plan, id: id(), name: `${plan.name.slice(0, 54)}（匯入）` }));
  return { ...current, activeId: imported[0].id, plans: [...current.plans, ...imported] };
}
export function downloadFile(name: string, content: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Prevent spreadsheet formula execution in an exported user/source text cell. */
export function csvCell(value: string | number): string {
  const text = String(value);
  return `"${(/^[\s]*[=+@-]/.test(text) ? "'" : "") + text.replace(/"/g, '""')}"`;
}
