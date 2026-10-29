"use client";
import { useEffect, useState } from "react";
import { COURSE_PLAN_STORAGE_KEY } from "@/lib/course-plan";
import { createWorkspace, parseBackup, workspaceKey, type PlannerWorkspace } from "@/lib/planner-workspace";

export function usePlannerWorkspace(semester: string) {
  const [workspace, setWorkspace] = useState(() => createWorkspace(semester));
  const [ready, setReady] = useState(false);
  const [storageMessage, setStorageMessage] = useState("");
  const [blockedWrite, setBlockedWrite] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = localStorage.getItem(workspaceKey(semester));
        if (stored) setWorkspace(parseBackup(JSON.parse(stored), semester));
        else {
          const old = JSON.parse(localStorage.getItem(`${COURSE_PLAN_STORAGE_KEY}:${semester}`) ?? "[]") as unknown;
          setWorkspace(createWorkspace(semester, Array.isArray(old) ? old.filter((item): item is string => typeof item === "string") : []));
        }
      } catch {
        setBlockedWrite(true);
        setStorageMessage("無法讀取儲存的課表。原始資料未被覆寫；目前的操作請先下載備份。");
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [semester]);
  function update(next: PlannerWorkspace) {
    // Persist within the user action: switching semester immediately afterwards
    // must not unmount the component before a deferred saving effect runs.
    setWorkspace(next);
    if (blockedWrite) {
      setStorageMessage("原始儲存資料無法讀取，因此未覆寫。請下載目前方案備份，並保留原始資料以便復原。");
      return;
    }
    try {
      localStorage.setItem(workspaceKey(semester), JSON.stringify(next));
      setStorageMessage("");
    } catch {
      setStorageMessage("瀏覽器無法保存變更。請下載備份，避免關閉頁面後遺失。");
    }
  }
  return { workspace, update, ready, storageMessage };
}
