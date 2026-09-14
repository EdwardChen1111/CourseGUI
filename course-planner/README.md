# NTUST Course Planner

以台科大公開課程資料為基礎的課程搜尋與學業規劃工具。它的首要目標是把「找課、建立候選課表、偵測衝堂」放在同一個簡潔的介面中，後續再逐步導入可追溯的主系、雙主修與輔系規則。

> 平台結果僅供個人規劃參考；正式修課與畢業資格仍以教務處規定及審核為準。

## 目前功能

- 以課號、課名或教師搜尋版本化的學期課程快照，並明示快照是全學期或篩選資料。
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
3. `.github/workflows/ci.yml` 會執行測試、lint 與 production build。
4. `.github/workflows/deploy-pages.yml` 會部署 `out/`。

部署工作流程會在 GitHub Actions 環境中自動設定 Next.js 的 repository base path；本機開發不會加入此前綴。

## 專案進度

請見 [docs/PROGRESS.md](docs/PROGRESS.md)。

目前 MVP 的已交付功能、資料邊界與待人工審核項目見 [docs/MVP_SCOPE.md](docs/MVP_SCOPE.md)。
## 課程資料同步

網站部署時只讀取已提交的靜態快照，不會在使用者瀏覽時向校方 API 發出請求。維護者可用下列指令從公開 API 產生課程資料，先預覽差異，再明確指定 `--write` 寫入快照；每次寫入前都會以 schema 驗證。

```bash
npm run sync:courses -- --semester=1151 --course-name=微積分
npm run sync:courses -- --semester=1151 --course-name=微積分 --write
```

第一個指令是唯讀的 dry run。第二個指令才會更新 `src/data/courses/1151.json`；目前以課名篩選示範，避免意外寫入過大的全校課程資料。同步會輸出新增、移除、異動課號數量與無法辨識的時段 token 數量，供人工審核後再提交版本。
