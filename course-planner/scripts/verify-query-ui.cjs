/* eslint-disable @typescript-eslint/no-require-imports */
// Uses the bundled Playwright runtime when available; no production dependency.
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");
const runtime = process.env.PLAYWRIGHT_MODULE || "playwright";
const { chromium } = require(runtime);
const root = path.resolve(__dirname, "../out");
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");
    const relative = decodeURIComponent(url.pathname).replace(/^\/CourseGUI/, "");
    const file = path.resolve(root, `.${relative === "/" ? "/index.html" : relative}`);
    if (!file.startsWith(root + path.sep)) throw new Error("Invalid path");
    const content = await fs.readFile(file);
    response.setHeader("Content-Type", file.endsWith(".json") ? "application/json" : file.endsWith(".js") ? "text/javascript" : file.endsWith(".css") ? "text/css" : "text/html");
    response.end(content);
  } catch { response.writeHead(404).end(); }
});
async function main() {
  await new Promise((resolve) => server.listen(4173, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("Failed to load resource")) errors.push(message.text());
    });
    await page.goto(process.env.UI_VERIFY_URL || "http://127.0.0.1:4173/CourseGUI/");
    await page.getByText("校方課程查詢條件", { exact: true }).waitFor();
    await page.getByLabel("學校", { exact: true }).selectOption("3N");
    await page.waitForTimeout(300);
    assert((await page.locator("#planner article").count()) > 0, "Foreign school filter is empty");
    assert((await page.locator("#planner article").allTextContents()).every((text) => text.includes("3N")), "Foreign school mismatch");
    await page.getByRole("button", { name: "清除篩選", exact: true }).click();
    await page.getByLabel("課程代碼", { exact: true }).fill("CS");
    await page.waitForTimeout(300);
    assert((await page.locator("#planner article").allTextContents()).every((text) => /CS\w+/.test(text)), "Department-code mismatch");
    await page.getByRole("button", { name: "清除篩選", exact: true }).click();
    await page.getByLabel("華夏校區", { exact: true }).check();
    await page.waitForTimeout(300);
    assert((await page.locator("#planner article").count()) > 0, "Campus filter is empty");
    await page.getByText(/^時間表：/).click();
    assert.equal(await page.locator("details table input[type=checkbox]").count(), 98);
    await page.getByLabel("星期一第1節", { exact: true }).check();
    await page.getByRole("button", { name: "清除篩選", exact: true }).click();
    const originalYear = await page.getByLabel("學年度", { exact: true }).inputValue();
    const originalTerm = await page.getByLabel("學期", { exact: true }).inputValue();
    await page.getByRole("button", { name: "加入課表", exact: true }).first().click();
    await page.waitForTimeout(300);
    await page.reload();
    await page.getByRole("button", { name: "移出課表", exact: true }).first().waitFor();
    const availableYears = await page.getByLabel("學年度", { exact: true }).locator("option:not(:disabled)").evaluateAll((options) => options.map((option) => option.value));
    const expectedCatalog = JSON.parse(await fs.readFile(path.resolve(__dirname, "../src/data/catalog-index.json"), "utf8"));
    const expectedYears = [...new Set(expectedCatalog.semesters.map((item) => item.semester.slice(0, -1).trim()))].sort((a, b) => Number(b) - Number(a));
    assert.deepEqual(availableYears, expectedYears, "Deployed catalog does not match verified local academic years");
    const expectedUnavailableYears = new Set((expectedCatalog.unavailableSemesters || []).map((item) => item.semester.slice(0, -1).trim()));
    assert.equal(await page.getByLabel("學年度", { exact: true }).locator("option:disabled").count(), expectedUnavailableYears.size);
    const years = availableYears.length;
    if (years > 1) {
      await page.getByLabel("學年度", { exact: true }).selectOption({ index: 1 });
      await page.getByText("校方課程查詢條件", { exact: true }).waitFor();
      assert(await page.getByLabel("課程代碼", { exact: true }).inputValue() === "", "Filters leaked across semesters");
      assert.equal(await page.getByRole("button", { name: "移出課表", exact: true }).count(), 0, "Plan leaked across semesters");
      await page.getByLabel("學年度", { exact: true }).selectOption(originalYear);
      await page.getByLabel("學期", { exact: true }).selectOption(originalTerm);
      await page.getByRole("button", { name: "移出課表", exact: true }).first().waitFor();
      await page.getByLabel("學年度", { exact: true }).selectOption(availableYears[years - 1]);
      await page.getByText("校方課程查詢條件", { exact: true }).waitFor();
      const summer = await page.getByLabel("學期", { exact: true }).locator("option").evaluateAll((options) => options.map((option) => option.value).find((value) => value.endsWith("H")));
      if (summer) {
        await page.getByLabel("學期", { exact: true }).selectOption(summer);
        await page.getByText("校方課程查詢條件", { exact: true }).waitFor();
        assert.equal(await page.getByLabel("學期", { exact: true }).inputValue(), summer);
      }
    }
    await page.route("**/courses/*.json", (route) => route.fulfill({ status: 503, body: "unavailable" }));
    await page.reload();
    await page.locator("#planner [role=alert]").waitFor();
    await page.unroute("**/courses/*.json");
    await page.getByRole("button", { name: "重新載入", exact: true }).click();
    await page.getByText("校方課程查詢條件", { exact: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    const overflow = await page.evaluate(() => ({ width: window.innerWidth, scroll: document.documentElement.scrollWidth, elements: [...document.querySelectorAll("#planner *")].map((element) => ({ tag: element.tagName, className: element.className, right: element.getBoundingClientRect().right })).filter((element) => element.right > window.innerWidth + 2).slice(0, 8) }));
    assert(overflow.scroll <= overflow.width + 2, `Mobile page has horizontal overflow: ${JSON.stringify(overflow)}`);
    assert.deepEqual(errors, []);
    console.log(`Browser query checks passed; ${years} academic years available`);
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
