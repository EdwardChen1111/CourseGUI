# 修課規則匯入與審核流程

主系、雙主修與輔系規則會直接影響修課決策，因此資料檔不是從網頁或 PDF 自動擷取後立即發布。每一份 requirement set 都必須通過以下流程。

1. 選定適用的入學年度、學制、系所與規則類型；不可跨年度或跨學制混用。
2. 保存來源網址、來源名稱與擷取時間，並依官方原始表格轉錄每個規則群組。群組中的 `requiredCourseNos` 是必須修畢的課號；若是「從指定清單任選若干學分」，將全部可計入課號填入 `creditEligibleCourseNos`，且所有必修課號必須也在此清單中。
3. 先以 `reviewStatus: "draft"` 提交；草稿資料在網站上必須顯示「審核中」。
4. 審核者逐項比對課號、最低學分與例外說明。完成時寫入 `reviewedBy`、`reviewedAt`、`reviewNotes`，再將狀態改為 `reviewed`。
5. 執行 `npm run validate:data`、`npm run test` 與 `npm run build`；在 PR 或 commit 中記錄原始公告版本與差異。

Schema 對 `reviewStatus: "reviewed"` 強制要求完整的審核紀錄，也會拒絕必修課不在可計入清單、或可計入課號重複的資料。`demo` 僅能用於介面開發，永遠不可宣稱為正式規則。即使狀態為已人工審核，網站結果仍是規劃輔助，最終資格應以教務處審核為準。

## 受控匯入指令

先將人工轉錄的規則放在專案內的草稿檔，使用 dry run 檢視資料與既有版本的差異；只有加上 `--write` 才會寫入部署資料目錄。

```bash
npm run import:requirements -- --input=drafts/cs-112-undergraduate.json --output=src/data/requirements/cs-112-undergraduate.json
npm run import:requirements -- --input=drafts/cs-112-undergraduate.json --output=src/data/requirements/cs-112-undergraduate.json --write
```

預設只允許匯入 `draft` 規則。要發布已覆核規則，必須先核對審核欄位，並以 `--allow-reviewed --write` 明確確認；`demo` 規則永遠不能使用此指令匯入。格式可參考 `docs/examples/requirement-draft.json`，範例本身不可發布。
