# NTUST Course Planner

以台科大公開課程資料為基礎的課程搜尋與學業規劃工具。它的首要目標是把「找課、建立候選課表、偵測衝堂」放在同一個簡潔的介面中，後續再逐步導入可追溯的主系、雙主修與輔系規則。

> 平台結果僅供個人規劃參考；正式修課與畢業資格仍以教務處規定及審核為準。

## 目前功能

- 選擇學年度／學期／暑期，查詢完整學期課程；提供校區、學院／系所、外校、通識向度、教學類型、學制與逐節時間表篩選。詳見 [校方查詢功能對照](docs/QUERY_FILTERS.md)。
- 顯示開課類型、教室、擷取時選課人數與校方備註；人數不等同即時名額。
- 加入或移出候選課表，並即時計算總學分。
- 解析 NTUST 課表時段 token（如 `T6`、`R10`）並偵測衝堂。
- 以每週格狀課表呈現已選課程；衝堂時段以紅色標示。
- 候選課表儲存在使用者自己的瀏覽器，可隨時清除；不會傳送到伺服器或校務系統。
- 在載入時驗證課程快照，檢查資料格式、來源、學期一致性與課號唯一性。
- 提供主系、雙主修與輔系共用的 requirement set schema 與修課進度計算核心。

## 技術選型

- Next.js 16、React 19、TypeScript、Tailwind CSS。
- Zod：校方資料與規則的 runtime schema validation。
- Vitest：時段解析、衝堂與資料驗證的單元測試。
- GitHub Actions：CI 以及 GitHub Pages 靜態部署。

## 本機啟動

需要 Node.js 24 與 npm。

```bash
npm install
npm run dev
```

開啟 `http://localhost:3000` 即可使用。

## 驗證

```bash
npm run test
npm run lint
npm run build
```

`npm run build` 會產生 `out/` 靜態網站。專案不使用需要伺服器執行的 Next.js API route，因此可部署至 GitHub Pages。

## 資料來源與治理

| 用途 | 官方資料來源 | 處理原則 |
|---|---|---|
| 課程開課資訊 | [課程查詢系統](https://querycourse.ntust.edu.tw/QueryCourse/#/) | 每學期建立快照，保留來源與擷取時間。 |
| 課程查詢資料端點 | [courses API](https://querycourse.ntust.edu.tw/querycourse/api/courses) | 僅透過資料同步 adapter 使用；需限流、快取與 schema 驗證。 |
| 主系必修 | [各系必修表](https://dss20.ntust.edu.tw/edua/list/lst_eduneed.aspx) | 依入學年度、學制與系所人工審核後匯入。 |
| 雙主修 | [雙主修應修科目表](https://demoadmin.ntust.edu.tw/var/file/48/1048/img/2790/T-DOUBLE.pdf) | 將各年度正式規則轉為版本化 JSON。 |
| 輔系 | [輔系應修科目表](https://demoadmin.ntust.edu.tw/var/file/48/1048/img/2790/T-MINOR.pdf) | 將各年度正式規則轉為版本化 JSON。 |

不會保存學生 SSO 密碼、成績或正式選課紀錄。所有畢業規則都需保留來源網址、來源名稱、適用年度、版本、擷取時間與審核紀錄；詳見[修課規則匯入與審核流程](docs/REQUIREMENT_REVIEW.md)。

## 部署至 GitHub Pages

1. 將 repository 的 GitHub Pages source 設為 **GitHub Actions**。
2. 推送至 `main` 分支。
3. 儲存庫根目錄 `.github/workflows/ci.yml` 會執行資料驗證、測試、lint 與 production build。
4. 根目錄 `.github/workflows/deploy-pages.yml` 會部署 `course-planner/out/`。

部署工作流程會在 GitHub Actions 環境中自動設定 Next.js 的 repository base path；本機開發不會加入此前綴。

## 專案進度

請見 [docs/PROGRESS.md](docs/PROGRESS.md)。

目前 MVP 的已交付功能、資料邊界與待人工審核項目見 [docs/MVP_SCOPE.md](docs/MVP_SCOPE.md)。
## 課程資料同步

網站按學期載入已提交的完整靜態快照，不會在使用者瀏覽時向校方 API 發出請求。完整查詢使用下列同步流程；沒有 `--write` 時只驗證，不寫入。`--resume` 接續已完成的快照，若要重新更新人數／分類請勿使用 resume。

```bash
npm run sync:catalog -- --semesters=1151
npm run sync:catalog -- --write
npm run sync:catalog -- --write --resume
npm run sync:catalog -- --write --index-only --audit-unavailable --require-complete
npm run validate:data
```

完整快照位於 `public/courses/`；索引與來源不可用紀錄位於 `src/data/catalog-index.json`。校方 95–99 年度 API 格式錯誤的學期會單獨標示，不以空課程快照替代。

舊版單一關鍵字快照 adapter 仍保留供範例與差異測試，以下不會更新公開完整查詢索引：

```bash
npm run sync:courses -- --semester=1151 --course-name=微積分
npm run sync:courses -- --semester=1151 --course-name=微積分 --write
```

第一個指令是唯讀的 dry run。第二個指令更新範例 `src/data/courses/1151.json`；會輸出新增、移除、異動課號數量與無法辨識的時段 token 數量，供人工審核後再提交版本。

## 修課規則匯入

正式規則必須先由維護者依官方表格人工轉錄成草稿，再用受控匯入指令預覽差異。預設只接受 `draft` 規則；已人工審核的規則需要另加 `--allow-reviewed` 明確確認，`demo` 規則永遠不能匯入發布資料。

```bash
npm run import:requirements -- --input=drafts/cs-112-undergraduate.json --output=src/data/requirements/cs-112-undergraduate.json
npm run import:requirements -- --input=drafts/cs-112-undergraduate.json --output=src/data/requirements/cs-112-undergraduate.json --write
```

第一個指令僅顯示群組與差異，第二個才會寫入。詳細欄位、審核步驟與草稿格式請見 [修課規則匯入與審核流程](docs/REQUIREMENT_REVIEW.md)。
