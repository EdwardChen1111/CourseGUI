import { expect, test } from "@playwright/test";
import { categoryLabels, curriculumSources, sheets, type Category } from "../src/lib/curriculum";

for (const [year, expectedOpen, expectedClosed] of [
  ["112", 67, 2], ["113", 64, 5], ["114", 49, 5], ["115", 50, 4],
] as const) {
  test(year + " curriculum directory opens every listed department on mobile", async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("");
    await page.getByRole("button", { name: "修課紀錄與規則" }).click();
    const library = page.getByRole("region", { name: "校方科目表" });
    await library.getByLabel("科目表年度").selectOption(year);
    const department = library.getByLabel("查閱系所");
    const preview = library.locator(".sheet-preview");
    let open = 0;
    let closed = 0;
    for (const category of Object.keys(categoryLabels) as Category[]) {
      await library.getByLabel("科目表類別").selectOption(category);
      const available = sheets.filter((s) => s.year === year && s.category === category);
      const source = curriculumSources.find((s) => s.year === year && s.category === category);
      const directory = source?.departments ?? available.map((s) => ({ name: s.department, closed: false, page: 0 }));
      const options = await department.locator("option").evaluateAll((items) => items.map((o) => (o as HTMLOptionElement).value).filter(Boolean));
      expect(options.sort()).toEqual(directory.map((d) => d.name).sort());
      for (const entry of directory) {
        await department.selectOption(entry.name);
        if (entry.closed) {
          await expect(library.getByText(/已停止受理新申請/)).toBeVisible();
          await expect(preview).toHaveCount(0);
          await expect(library.getByRole("link").first()).toHaveAttribute("href", source!.url + "#page=" + entry.page);
          closed++;
          continue;
        }
        const sheet = available.find((s) => s.department === entry.name)!;
        const role = category === "major" ? "四技主系" : categoryLabels[category];
        await expect(preview.getByRole("heading")).toHaveText(year + " " + sheet.shortName + role + " · 進度預覽");
        await expect(preview.getByRole("link").first()).toHaveAttribute("href", sheet.url);
        const groups = preview.locator(".sheet-group summary");
        await expect(groups).toHaveCount(sheet.groups.length);
        await expect(groups.first()).toContainText("尚缺 " + sheet.groups[0].minimum);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(392);
        open++;
      }
    }
    expect([open, closed]).toEqual([expectedOpen, expectedClosed]);
    expect(errors).toEqual([]);
  });
}
