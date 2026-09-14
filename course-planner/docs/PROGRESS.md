# 專案進度

## 2026-09-14 - Milestone 1：專案基礎

- 建立 Next.js、TypeScript、Tailwind CSS 專案。
- 設定靜態輸出，支援 GitHub Pages 專案網站的 base path。
- 加入 CI 與 GitHub Pages 部署工作流程。
- 移除建置時需連線下載的 Google Fonts，改用系統字型。
- 建立第一版產品首頁，明確呈現 MVP 範圍與資料透明化原則。

### 驗證紀錄

- `npm run lint`：通過。
- `npm run build`：通過，確認首頁可靜態預先產生並輸出至 `out/`。

### 下一步

1. 定義課程與時段的資料 schema。
2. 建立本機課程快照與資料驗證程式。
3. 實作課程搜尋與候選課表的互動流程。

## 2026-09-14 - Milestone 2：課程資料與衝堂核心

- 建立 `CourseOffering`、`Meeting` 與 `CourseSnapshot` 型別。
- 加入 1151 學期的最小課程快照，資料保留校方來源與更新時間。
- 實作 NTUST 時段 token 解析；不識別的格式會被保留為警告，不會被錯誤納入衝堂判定。
- 實作衝堂判定與重疊節次回傳。
- 加入 Vitest 及其與 Next.js 相同的 `@/` 路徑別名設定。

### 驗證紀錄

- `npm run test`：4 項測試通過。
- `npm run lint`：通過。
- `npm run build`：通過。
- 本機首頁已於瀏覽器檢視，主要文案與 MVP 區塊正常渲染。

### 下一步

1. 建立課程快照 JSON 的 runtime schema 驗證。
2. 實作課程搜尋與候選課表互動。
3. 加入 GitHub Actions 的資料驗證步驟。

## 2026-09-14 - Milestone 3：可操作的候選課表

- 以靜態 1151 課程快照建立可搜尋的課程清單。
- 支援依課號、課名或教師名稱即時搜尋。
- 支援新增與移除候選課程、統計總學分與顯示課程數。
- 當加入課程與既有候選課程重疊時，顯示衝堂提示與具體節次。

### 驗證紀錄

- `npm run test`：4 項測試通過。
- `npm run lint`：通過。
- `npm run build`：通過。
- 本機瀏覽器實測：加入兩門 4 學分課程後，候選課表正確顯示 8 學分與 2 門課。

### 下一步

1. 在匯入前以 runtime schema 驗證課程 JSON。
2. 補齊衝堂情境的展示資料與介面測試。
3. 導入主系必修 requirement set 格式與修課進度頁。

## 2026-09-14 - Milestone 4：資料防護與修課規則核心

- 使用 Zod 在 runtime 驗證課程快照的欄位、來源網址、時間戳記、學期一致性與課號唯一性。
- 建立獨立的資料載入層，避免介面直接信任原始 JSON。
- 建立主系、雙主修與輔系共用的 requirement set schema。
- 實作修課進度計算，能同時列出已完成學分與缺少的指定課號。

### 驗證紀錄

- `npm run test`：7 項測試通過。
- `npm run lint`：通過。
- `npm run build`：通過。

### 下一步

1. 建立可顯示 requirement set 的修課進度介面。
2. 將課程快照驗證納入 GitHub Actions。
3. 設計校方資料同步 adapter 與失敗告警資料。
