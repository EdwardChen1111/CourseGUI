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
