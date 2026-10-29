import { test, expect, type Page } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import catalog from "../src/data/catalog-index.json";
import type { CourseSnapshot } from "../src/lib/course";
const latest = JSON.parse(readFileSync(path.join("public/courses", catalog.semesters[0].file), "utf8")) as CourseSnapshot;

const semester = latest.semester;
const known = latest.offerings.find((course) => course.courseNo.startsWith("3T") && course.meetings.length === 2 && !course.hasUnrecognizedSchedule)!;
const dayLabels: Record<string, string> = { M: "一", T: "二", W: "三", R: "四", F: "五", S: "六", U: "日" };
async function open(page: Page, target = semester) {
  await page.goto(`?semester=${target}`);
  await expect(page.getByRole("heading", { name: "找一門適合你的課" })).toBeVisible();
  await expect(page.getByText("● 此裝置自動保存")).toBeVisible();
}
async function search(page: Page, code: string) { await page.getByLabel("課名、課號或教師", { exact: true }).fill(code); }

test("first screen is a usable tool; search, exact course schedule, pagination and filters work", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await open(page);
  expect((await page.locator("#course-search").boundingBox())!.y).toBeLessThan(500);
  await expect(page.locator(".course-card")).toHaveCount(20);
  const first = await page.locator(".course-card").first().getAttribute("data-course-no");
  await page.getByRole("button", { name: "下一頁", exact: true }).click();
  expect(await page.locator(".course-card").first().getAttribute("data-course-no")).not.toBe(first);
  await search(page, known.courseNo);
  await expect(page.locator(".course-card")).toHaveCount(1);
  await expect(page.locator(".course-card")).toContainText(`週${dayLabels[known.meetings[0].weekday]}`);
  await page.getByRole("button", { name: `加入 ${known.courseNo} ${known.title}`, exact: true }).click();
  await expect(page.locator(".timetable-course")).toHaveCount(2);
  await page.getByRole("button", { name: "重設所有條件", exact: true }).click();
  await page.locator(".filter-panel > summary").click();
  await page.getByLabel("學校", { exact: true }).selectOption("3T");
  expect((await page.locator(".course-card").evaluateAll((elements) => elements.map((element) => element.getAttribute("data-course-no")))).every((id) => id?.startsWith("3T"))).toBe(true);
  await page.getByLabel("學校", { exact: true }).selectOption("all");
  await page.getByLabel("華夏校區", { exact: true }).check();
  const expected = latest.offerings.filter((course) => course.facets?.includes("Hwa_Hsia_Campus")).length;
  await expect(page.getByTestId("result-count")).toHaveText(`找到 ${expected.toLocaleString()} 門課程`);
  await page.getByLabel("華夏校區", { exact: true }).uncheck();
  await page.getByText(/^時間表：/).click();
  await page.getByLabel(`星期${dayLabels[known.meetings[0].weekday]}第${known.meetings[0].period}節`, { exact: true }).check();
  await search(page, known.courseNo);
  await expect(page.locator(".course-card")).toHaveCount(1);
  await page.getByLabel("僅列出勾選節次", { exact: true }).check();
  await expect(page.locator(".course-card")).toHaveCount(0);
  await page.getByLabel(`星期${dayLabels[known.meetings[1].weekday]}第${known.meetings[1].period}節`, { exact: true }).check();
  await expect(page.locator(".course-card")).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(392);
  await mkdir("audit-artifacts", { recursive: true });
  await page.screenshot({ path: "audit-artifacts/mobile-filters.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("non-default semesters and independent plans survive refresh, removal, undo and backup import", async ({ page }) => {
  const previous = catalog.semesters.find((entry) => !entry.semester.endsWith("H") && entry.semester !== semester)!;
  await open(page, previous.semester);
  const add = page.locator(".course-card button").first();
  const code = (await page.locator(".course-card").first().getAttribute("data-course-no"))!;
  await add.click();
  await page.reload();
  await expect(page.getByLabel("學期", { exact: true })).toHaveValue(previous.semester);
  await expect(page.locator(".selected-course")).toContainText(code);
  await page.getByRole("button", { name: `從課表移除 ${code}`, exact: true }).click();
  await expect(page.locator(".selected-course")).toHaveCount(0);
  await page.getByRole("button", { name: "復原", exact: true }).click();
  await expect(page.locator(".selected-course")).toHaveCount(1);
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "下載備份", exact: true }).click();
  const backup = await downloaded;
  const contents = await readFile((await backup.path())!, "utf8");
  await page.getByText("管理課表方案", { exact: true }).click();
  await page.getByLabel("方案名稱", { exact: true }).fill("週五不排課");
  await page.getByRole("button", { name: "新增方案", exact: true }).click();
  await expect(page.locator(".selected-course")).toHaveCount(0);
  await page.getByLabel("匯入課表備份檔案", { exact: true }).setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(contents) });
  await expect(page.locator(".selected-course")).toContainText(code);
  await expect(page.getByLabel("課表方案").locator("option")).toHaveCount(3);
  await page.getByLabel("匯入課表備份檔案", { exact: true }).setInputFiles({ name: "wrong.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ ...JSON.parse(contents), semester })) });
  await expect(page.locator(".plan-message")).toContainText("請先切換學期");
  await expect(page.locator(".selected-course")).toHaveCount(1);
});

test("missing schedules never report a conflict-free plan and saved missing courses remain visible", async ({ page }) => {
  const untimed = latest.offerings.find((course) => !course.meetings.length)!;
  await page.addInitScript(({ semester, courseNo }) => {
    localStorage.setItem(`ntust:plans:v2:${semester}`, JSON.stringify({ version: 2, semester, activeId: "default", plans: [{ id: "default", name: "保留測試", courseNos: [courseNo, "UNAVAILABLE-COURSE"] }] }));
  }, { semester, courseNo: untimed.courseNo });
  await open(page);
  await expect(page.locator(".plan-panel")).toContainText("不能確認整份課表沒有衝堂");
  await expect(page.locator(".plan-panel")).toContainText("UNAVAILABLE-COURSE");
  await expect(page.getByText("已知上課時段無衝堂", { exact: true })).toHaveCount(0);
});

test("network errors retry; storage failures are visible; mobile has usable navigation and no overflow", async ({ page }) => {
  await page.route("**/courses/*.json*", (route) => route.fulfill({ status: 503, body: "unavailable" }));
  await page.goto(`?semester=${semester}`);
  await expect(page.getByRole("heading", { name: "暫時無法載入課程" })).toBeVisible();
  await page.unroute("**/courses/*.json*");
  await page.getByRole("button", { name: "重新載入", exact: true }).click();
  await expect(page.locator(".course-card").first()).toBeVisible();
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException("blocked", "QuotaExceededError"); }; });
  await search(page, known.courseNo);
  await page.locator(".course-card button").click();
  await expect(page.locator(".plan-panel [role=alert]")).toContainText("瀏覽器無法保存");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: /我的課表 ·/ })).toBeInViewport();
  await page.getByRole("button", { name: /我的課表 ·/ }).click();
  await expect(page.locator(".selected-course")).toContainText(known.title);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(392);
  await mkdir("audit-artifacts", { recursive: true });
  await page.screenshot({ path: "audit-artifacts/mobile-plan.png", fullPage: true });
});

test("academic records use personal data and passed courses, not planned classes or demo rules", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "修課紀錄與規則", exact: true }).click();
  await expect(page.getByText("尚未匯入適用規則", { exact: true })).toBeVisible();
  await page.getByLabel("入學年度", { exact: true }).fill("113");
  const panel = page.getByRole("region", { name: "修課紀錄與規則" });
  await panel.getByLabel("課程代碼", { exact: true }).fill("CS1001301");
  await panel.getByLabel("課程名稱", { exact: true }).fill("程式設計");
  await panel.getByLabel("修課結果", { exact: true }).selectOption("taking");
  await page.getByRole("button", { name: "新增紀錄", exact: true }).click();
  await expect(page.getByText("0 已通過學分", { exact: true })).toBeVisible();
  await panel.getByLabel("課程代碼", { exact: true }).fill("CS1001302");
  await panel.getByLabel("課程名稱", { exact: true }).fill("程式設計");
  await panel.getByLabel("修課結果", { exact: true }).selectOption("passed");
  await page.getByRole("button", { name: "新增紀錄", exact: true }).click();
  await expect(page.getByText("3 已通過學分", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "修課紀錄與規則", exact: true }).click();
  await expect(page.getByText("3 已通過學分", { exact: true })).toBeVisible();
  const rule = { id: "test-rule", category: "minor", departmentCode: "CS", departmentName: "測試輔系", entryYear: "113", degreeType: "undergraduate", version: "test", sourceUrl: "https://www.ntust.edu.tw/", sourceTitle: "瀏覽器測試資料，非正式規則", sourceRetrievedAt: "2026-10-28T00:00:00.000Z", reviewStatus: "draft", groups: [{ id: "core", name: "測試必修", minimumCredits: 3, requiredCourseNos: ["CS10013"] }] };
  await page.getByLabel("修課規則檔案", { exact: true }).setInputFiles({ name: "rule.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(rule)) });
  await expect(page.getByText("依此規則已達標", { exact: true })).toBeVisible();
  await page.getByLabel("入學年度", { exact: true }).fill("112");
  await expect(page.getByText("入學年度或學制與你的設定不符，未套用計算。", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "建立個人規則草稿", exact: true }).click();
  await page.getByLabel("規則系所名稱", { exact: true }).fill("個人輔系規劃");
  await page.getByLabel("規則類別", { exact: true }).selectOption("minor");
  await page.getByLabel("來源公告網址", { exact: true }).fill("https://www.ntust.edu.tw/");
  await page.getByLabel("群組名稱", { exact: true }).fill("基礎必修");
  await page.getByLabel("最低群組學分", { exact: true }).fill("3");
  await page.getByLabel("必須修過的課號", { exact: true }).fill("CS10013");
  await page.getByRole("button", { name: "儲存規則草稿", exact: true }).click();
  await expect(page.getByRole("heading", { name: "個人輔系規劃 · 輔系" })).toBeVisible();
  await expect(page.getByText("依此規則已達標", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "修課紀錄與規則", exact: true }).click();
  await expect(page.getByRole("heading", { name: "個人輔系規劃 · 輔系" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(392);
  await page.screenshot({ path: "audit-artifacts/mobile-academic.png", fullPage: true });
});

test("real overlapping classes are detected and excluded by availability filter", async ({ page }) => {
  const other = latest.offerings.find((course) => course.courseNo !== known.courseNo && course.meetings.some((meeting) => known.meetings.some((slot) => slot.weekday === meeting.weekday && slot.period === meeting.period)))!;
  await open(page);
  await search(page, known.courseNo);
  await page.locator(".course-card button").click();
  await search(page, other.courseNo);
  await expect(page.locator(".course-card")).toContainText("與目前課表衝堂");
  await page.getByLabel("只看可排入課表的課", { exact: true }).check();
  await expect(page.locator(".course-card")).toHaveCount(0);
  await page.getByLabel("只看可排入課表的課", { exact: true }).uncheck();
  await page.locator(".course-card button").click();
  await expect(page.locator(".plan-panel")).toContainText("1 組課程衝堂");
  await page.reload();
  await expect(page.locator(".plan-panel")).toContainText("1 組課程衝堂");
});

test("corrupt saved plans are reported without overwriting the original", async ({ page }) => {
  await page.addInitScript((semester) => localStorage.setItem(`ntust:plans:v2:${semester}`, "invalid-json"), semester);
  await page.goto(`?semester=${semester}`);
  await expect(page.locator(".plan-panel [role=alert]")).toContainText("原始資料未被覆寫");
  await search(page, known.courseNo);
  await page.locator(".course-card button").click();
  expect(await page.evaluate((semester) => localStorage.getItem(`ntust:plans:v2:${semester}`), semester)).toBe("invalid-json");
  await expect(page.locator(".selected-course")).toContainText(known.courseNo);
});

test("desktop screenshot and clean runtime", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await open(page);
  await search(page, "微積分");
  await page.locator(".course-card button").first().click();
  await mkdir("audit-artifacts", { recursive: true });
  await page.screenshot({ path: "audit-artifacts/desktop.png", fullPage: false });
  expect(errors).toEqual([]);
});
