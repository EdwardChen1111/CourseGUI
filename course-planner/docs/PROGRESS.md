# 專案進度

## 2026-09-14 - Milestone 10：每週課表視圖

- 新增候選課程的每週格狀課表，完整呈現週一至週日及台科時段（1–10、A–D）。
- 同一格的多門課程會保留並標示為紅色，讓衝堂不只停留在文字提示。
- 未有可辨識時段的課程不會被錯誤放入格子，並會清楚提示使用者。

### 驗證紀錄

- `npm run validate:data`：1 份課程快照與 1 份 requirement set 通過。
- `npm run test`：6 個測試檔、13 項測試通過；涵蓋時段定位、同格衝堂與無時段課程排除。
- `npm run lint`：通過。
- `npm run build`：通過，課表視圖可隨靜態產物產生。

### 下一步

1. 提交並由 GitHub Actions／Pages 驗證。
2. 建立經人工審核的系所 requirement set 匯入流程。

## 2026-09-14 - Milestone 9：官方課程 API 同步 Adapter

- 實測校方公開課程 API 的欄位，建立從 `CourseNo`、`CreditPoint`、`RequireOption`、`AllYear`、`Node` 與 `ClassRoomNo` 到內部課程快照的轉換層；同課號的多筆時段資料會先合併為一門可選課程。
- 同步程式預設為 dry run，只有明確傳入 `--write` 才會覆寫專案內的版本化快照。
- 新增快照差異檢查，將新增、移除、內容異動與僅時間戳變動分開處理。
- 無法辨識的時段 token 會統計並輸出，避免直接被納入衝堂計算。

### 驗證紀錄

- `npm run sync:courses -- --semester=1151 --course-name=微積分`：取得 48 門課，0 個未辨識時段 token，與原快照差異為新增 46、移除 0、異動 2；dry run 未寫入檔案。
- `npm run sync:courses -- --semester=1151 --course-name=微積分 --write`：成功寫入通過 schema 驗證的官方快照。
- `npm run validate:data`：1 份官方課程快照與 1 份 requirement set 通過。
- `npm run test`：5 個測試檔、11 項測試通過（包含 adapter 欄位轉換、教室對應、多時段合併與快照差異）。
- `npm run lint`：通過。
- `npm run build`：通過，成功生成 GitHub Pages 靜態產物。
- GitHub Actions：提交 `468a6d4` 的 Continuous Integration 與 Deploy to GitHub Pages workflow 均成功完成。

### 下一步

1. 依不同課名或系所建立經人工審核的課程快照範圍。
2. 將 requirement set 的人工審核匯入流程寫成可追溯的版本。
3. 推送後由 GitHub Actions 與 Pages 驗證此里程碑。

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

## 2026-09-14 - Milestone 6：GitHub Actions 根目錄部署修正

- 將 CI 與 GitHub Pages workflow 放到 repository 根目錄，使 GitHub 能實際偵測。
- 明確設定 workflow 的 `course-planner` 工作目錄與 npm lockfile 快取路徑。
- CI 現在會依序執行測試、lint 與 production build；部署 workflow 使用相同驗證後發布靜態 `out/`。

### 驗證紀錄

- `npm run test`：7 項測試通過。
- `npm run lint`：通過。
- `npm run build`：通過。
- GitHub Actions：CI 與 GitHub Pages workflow 已於 GitHub 成功完成。
- 公開部署：<https://edwardchen1111.github.io/CourseGUI/> 已實測可載入，候選課表可正常累計學分。

### 下一步

1. 在 GitHub Actions 核對 CI 與 Pages workflow 執行結果。
2. 建立可顯示 requirement set 的修課進度介面。
3. 設計校方資料同步 adapter 與失敗告警資料。

## 2026-09-14 - Milestone 7：修課進度展示

- 將 requirement set 計算核心連接至候選課表介面。
- 候選課表變動時，立即更新已完成學分與尚缺課號。
- 示範規則資料在介面與資料內容中均清楚標記為「非正式」，避免被視為畢業審核依據。

### 驗證紀錄

- `npm run test`：8 項測試通過。
- `npm run lint`：通過。
- `npm run build`：通過。
- 本機瀏覽器實測：依序加入兩門 4 學分課程，進度從 0/8 更新至 4/8 與 8/8，完成狀態正確顯示。

### 下一步

1. 建立經人工審核的系所 requirement set 匯入流程。
2. 建立校方課程資料同步 adapter 與快照差異檢查。
3. 將新功能推送並由 GitHub Actions／Pages 驗證。

## 2026-09-14 - Milestone 8：資料驗證部署閘門

- 新增 `npm run validate:data`，掃描並驗證所有課程快照與 requirement set JSON。
- 將資料驗證放在測試與建置前，納入 GitHub CI 和 Pages workflow。
- 資料錯誤會提供檔名、欄位路徑與驗證原因，阻止錯誤資料被部署。

### 驗證紀錄

- `npm run validate:data`：1 份課程快照與 1 份 requirement set 通過。
- `npm run test`：8 項測試通過。
- `npm run lint`：通過。
- `npm run build`：通過。

### 下一步

1. 建立校方課程資料同步 adapter 與快照差異檢查。
2. 建立經人工審核的系所 requirement set 匯入流程。
3. 由 GitHub Actions 驗證新資料閘門與公開部署。

## 2026-09-14 - Milestone 5：公開交接文件

- 將預設 Next.js README 改寫為專案的功能、技術、驗證、資料治理與 GitHub Pages 部署文件。
- 明確記錄校方資料來源與資料使用邊界。
- 明確記錄不保存 SSO 密碼、成績或正式選課紀錄的資料保護原則。

### 驗證紀錄

- `npm run test`：7 項測試通過。
- `npm run build`：通過。

### 下一步

1. 設定 GitHub 遠端並推送既有提交。
2. 建立可顯示 requirement set 的修課進度介面。
3. 設計校方資料同步 adapter 與失敗告警資料。
