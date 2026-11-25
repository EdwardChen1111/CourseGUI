# 修課規則匯入與審核流程

## 內建科目表

在「修課紀錄與規則」選擇科目表年度、類別及系所。101–115 學年度的 30 個連結取自教務處的年度索引。114、115 學年度各有 19 個系所或學程入口，頁碼依 PDF 實際表頭定位。部分學程只公告停止受理，在選擇時會標示。[輔系年度索引](https://demoadmin.ntust.edu.tw/var/file/48/1048/img/2790/T-MINOR.pdf) · [雙主修年度索引](https://demoadmin.ntust.edu.tw/var/file/48/1048/img/2790/T-DOUBLE.pdf)

可直接追蹤的第一批是下表六份。年度欄代表所選科目表版本。主系另核對入學年度、學制、系所，使用者須確認四技年制。加修年度由學生依適用的核准資料選擇。資料於 2026-11-25 核對。

| 科目表 | 114 學年度 | 115 學年度 | 計算範圍 |
| --- | --- | --- | --- |
| 材料系四技主系 | 計算機程式與應用 | 新增人工智慧四選一，無前一欄指定必修 | 教務處明細表兩頁，專業必修、實習、科數及任選學分。語文模組、檢測、體育與通識另外列出供核對。查詢選擇年度、四技、工程學院材料系 B0TX00。[查詢表單](https://dss20.ntust.edu.tw/edua/list/lst_eduneed.aspx) |
| 材料系輔系 | [原表第 2 頁](https://academic.ntust.edu.tw/var/file/48/1048/img/2790/114ass-sub.pdf#page=3) | [原表第 2 頁](https://academic.ntust.edu.tw/var/file/48/1048/img/2790/115ass-sub.pdf#page=3) | 七科各三學分，共 21 學分 |
| 材料系雙主修 | [原表第 2 頁](https://academic.ntust.edu.tw/var/file/48/1048/img/2790/114double.pdf#page=3) | [原表第 2 頁](https://academic.ntust.edu.tw/var/file/48/1048/img/2790/115double.pdf#page=3) | 15 科必修共 39 學分，專題或實習另選至少 3 學分 |

校方表格列科名，網站對照本校開課快照中的科名、開課單位及學分，列出可自動辨識的七碼科號。九碼班號先還原為科號，多個相符班號或舊科號只算同一科一次。尚無確認課號的科目仍列在表內。115 材料系輔系、雙主修的原表明定在校生需修 TX 課號，計算與抵免登錄都會檢查。

個別抵免應先取得系所核定，再填原課號、目標科目、採計學分及核定依據。認定只對選定科目表生效，同一原課號只能指定給一科。使用者可移除認定恢復一般課號比對。學分與免修資格依校方核定。每份科目表獨立顯示，主系與加修系間的兼充條件仍須核對。個人規則 JSON 的審核流程如下。

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
