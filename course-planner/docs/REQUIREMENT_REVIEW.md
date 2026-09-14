# 修課規則匯入與審核流程

主系、雙主修與輔系規則會直接影響修課決策，因此資料檔不是從網頁或 PDF 自動擷取後立即發布。每一份 requirement set 都必須通過以下流程。

1. 選定適用的入學年度、學制、系所與規則類型；不可跨年度或跨學制混用。
2. 保存來源網址、來源名稱與擷取時間，並依官方原始表格轉錄每個規則群組。
3. 先以 `reviewStatus: "draft"` 提交；草稿資料在網站上必須顯示「審核中」。
4. 審核者逐項比對課號、最低學分與例外說明。完成時寫入 `reviewedBy`、`reviewedAt`、`reviewNotes`，再將狀態改為 `reviewed`。
5. 執行 `npm run validate:data`、`npm run test` 與 `npm run build`；在 PR 或 commit 中記錄原始公告版本與差異。

Schema 對 `reviewStatus: "reviewed"` 強制要求完整的審核紀錄。`demo` 僅能用於介面開發，永遠不可宣稱為正式規則。即使狀態為已人工審核，網站結果仍是規劃輔助，最終資格應以教務處審核為準。
