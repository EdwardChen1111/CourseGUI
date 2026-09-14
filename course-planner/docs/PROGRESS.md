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
