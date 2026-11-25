import departmentSheets from "@/data/department-curricula.json";
import sources from "@/data/curriculum-sources.json";
import { earnedCourses, subjectCode, type AcademicData } from "./academic-records";

export const categoryLabels = { major: "主系", minor: "輔系", "double-major": "雙主修" } as const;
export type Category = keyof typeof categoryLabels;
export const materials = "材料科學與工程系";
export const majorQuery = "https://dss20.ntust.edu.tw/edua/list/lst_eduneed.aspx";
export const curriculumSources = sources;

type Subject = {
  title: string;
  credits: number;
  codes: string[];
  actual?: boolean;
  area?: string;
  alternatives?: Subject[][];
  pairedWith?: string[];
};
function subject(title: string, credits: number, ...codes: string[]): Subject {
  return { title, credits, codes };
}
const minorCore = [
  subject("材料科學(一)", 3, "TX46113"), subject("材料科學(二)", 3, "TX46123"),
  subject("材料力學", 3, "TX43033"), subject("材料熱力學(一)", 3, "TX42213"),
  subject("有機化學(一)", 3, "TX21133"), subject("高分子導論", 3, "TX16103"),
  subject("材料物理性質", 3, "TX41163"),
];
const analysis = subject("材料分析", 3, "TX41153", "TX41157");
const kinetics = subject("材料動力學與相變化", 3, "TX33103");
const semiconductor = subject("半導體材料物理", 3, "TX41193");
const diffraction = subject("結晶與繞射導論", 3, "TX16083", "TX16087");
const math = subject("工程數學(一)", 3, "TX30033");
const labs = [
  subject("材料實驗(一)", 1, "TX37093"), subject("材料實驗(二)", 1, "TX41043"),
  subject("材料實驗(三)", 1, "TX41063", "TX41067"),
];
const project = [
  subject("實務專題(上)", 2, "TX499A0"), subject("實務專題(下)", 2, "TX499B0"),
  subject("材料工程暑期校外實習(一)", 3, "TX24083"), subject("材料工程暑期校外實習(二)", 3, "TX24077"),
  subject("材料工程校外實習(一)", 9, "TX24093"), subject("材料工程校外實習(二)", 9, "TX24013", "TX24017"),
];
const majorCore = [
  ...minorCore, diffraction, math, ...labs,
  subject("工程數學(二)", 3, "TX30023"), subject("生涯論壇與職業倫理", 1, "TX16153"),
  subject("化學(上)", 3, "TX165A0"), subject("化學(下)", 3, "TX165B0"),
  subject("物理(上)", 3, "CE161A0"), subject("物理(下)", 3, "CE161B0"),
  subject("微積分(上)", 4, "CE162A0"), subject("微積分(下)", 4, "CE162B0"),
  subject("化學實習(上)", 1, "TX175A0"), subject("化學實習(下)", 1, "TX175B0"),
  subject("物理實習(上)", 1, "CE173A0"), subject("物理實習(下)", 1, "CE173B0"),
  subject("社會實踐", 1, "TC10103"), subject("新生中文說寫專題", 3, "CC12573"),
];
const specialization = [
  analysis, semiconductor, kinetics, subject("工業電子學", 3, "TX44043"),
  subject("高分子化學", 3, "TX32043"), subject("材料熱力學(二)", 3, "TX41233"),
  subject("高分子加工", 3, "TX42103"), subject("半導體元件物理", 3, "TX42243"), subject("高分子物理", 3, "TX32053"),
];
type Group = {
  label: string;
  mode: "all" | "credits" | "subjects";
  minimum: number;
  subjects: Subject[];
  minAreas?: number;
  manual?: { target: string; prefixes: string[]; eligible?: string[]; cappedCodes?: string[]; cap?: number };
};
const required = (label: string, subjects: Subject[]): Group => ({ label, subjects, mode: "all", minimum: subjects.length });
const practice: Group = { label: "實務專題與實習", subjects: project, minimum: 3, mode: "credits" };
export type Sheet = {
  id: string; year: string; category: Category; url: string; groups: Group[]; conditions: string[];
  department: string; shortName: string; code: string; sourcePrefix?: string; page?: number;
};
function makeSheet(year: string, category: Category): Sheet {
  const id = [year, "TX", category].join("-");
  const identity = { department: materials, shortName: "材料系", code: "TX" };
  if (category === "major") {
    const groups = [
      required("指定必修與實習", year === "114" ? [...majorCore, subject("計算機程式與應用", 3, "TX22073")] : majorCore),
      required("初階數學（通過一次）", [subject("初階數學(一)", 0, "CE15073")]),
      { label: "專業科目任選五科", mode: "subjects" as const, minimum: 5, subjects: specialization },
      practice,
    ];
    if (year === "115") groups.push({
      label: "人工智慧任選一科", mode: "subjects", minimum: 1,
      subjects: [
        subject("資料到預測：監督式機器學習導論", 0, "TX42293"), subject("數據處理實務之程式應用", 0, "TX42303"),
        subject("機器學習導論於材料科學應用", 0), subject("人工智慧導論：材料探索", 0),
      ],
    });
    return { ...identity, id, year, category, url: majorQuery, groups, conditions: [
      "四技 B0TX00。主系畢業總學分與選修規定請另依系上公告核對。",
      "英文模組 12 學分與校定英文能力檢測 1 次，請依語言中心紀錄核對。",
      "國文群組 3 學分、通識 15 學分及體育 6 次，請依教務處紀錄核對。",
    ] };
  }
  const annual = sources.find((item) => item.year === year && item.category === category)!;
  const page = annual.departments.find((dept) => dept.name === materials)!.page;
  const groups = category === "minor" ? [required("輔系必修（21 學分）", minorCore)] : [
    required("雙主修必修（39 學分）", [...minorCore, analysis, kinetics, semiconductor, diffraction, math, ...labs]), practice,
  ];
  return { ...identity, id, year, category, page, sourcePrefix: year === "115" ? "TX" : undefined, url: annual.url + "#page=" + page, groups, conditions: [
    year === "115" ? "此版原表註明在校生應修材料系開設、課碼為 TX 開頭的課程。" : "114 原表列科名與學分。115 公告另列 TX 課號限制並註明在校生適用，跨年度採計請向系辦核對。",
    "若同一門課也用於主系，兼充資格需要系所核對。此處顯示單份科目表的進度。",
  ] };
}

const materialSheets: Sheet[] = ["114", "115"].flatMap((year) =>
  (["major", "minor", "double-major"] as const).map((category) => makeSheet(year, category))
);

function attachSource(sheet: Omit<Sheet, "url">): Sheet {
  if (sheet.category === "major") return { ...sheet, url: majorQuery };
  const source = sources.find((entry) => entry.year === sheet.year && entry.category === sheet.category);
  const department = source?.departments.find((entry) => !entry.closed && entry.name === sheet.department);
  if (!source || !department) throw new Error(`Missing curriculum source for ${sheet.id}`);
  return { ...sheet, url: source.url + "#page=" + department.page, page: department.page };
}
type Edition = Omit<Sheet, "id" | "year" | "url"> & { years: string[] };
const otherSheets = (departmentSheets as Edition[]).flatMap(({ years, ...definition }) =>
  years.map((year) => attachSource({ ...definition, year, id: [year, definition.code, definition.category].join("-") }))
);
export const sheets = [...materialSheets, ...otherSheets];

export function fitsDepartment(sheet: Sheet, name: string) {
  const normalized = name.normalize("NFKC").replace(/\s/g, "").toUpperCase();
  return [sheet.department, sheet.shortName, sheet.code].some((alias) => normalized === alias ||
    normalized.split("學院").at(-1) === alias);
}

export type Recognition = NonNullable<AcademicData["recognitions"]>[number];
export function allowedSource(sheet: Sheet, code: string) {
  return !sheet.sourcePrefix || subjectCode(code).startsWith(sheet.sourcePrefix);
}

export function eligibleTarget(group: Group, code: string) {
  const prefixes = group.manual?.prefixes ?? [];
  return !prefixes.length || prefixes.some((prefix) => subjectCode(code).startsWith(prefix));
}

/** Assign each passed lab to a distinct eligible lecture, including the interchangeable IC lectures. */
function pairedLabs(subjects: Subject[], passed: Set<string>) {
  const lectureToLab = new Map<string, Subject>();
  function assign(lab: Subject, tried: Set<string>): boolean {
    for (const lecture of lab.pairedWith ?? []) {
      if (!passed.has(lecture) || tried.has(lecture)) continue;
      tried.add(lecture);
      const other = lectureToLab.get(lecture);
      if (other && !assign(other, tried)) continue;
      lectureToLab.set(lecture, lab);
      return true;
    }
    return false;
  }
  for (const lab of subjects) if (passed.has(lab.title)) assign(lab, new Set());
  return new Set([...lectureToLab.values()].map((lab) => lab.title));
}

type SubjectResult = Subject & { credited: number; passed: boolean; routes: SubjectResult[][] };

export function evaluateSheet(sheet: Sheet, records: AcademicData["records"], decisions: Recognition[] = []) {
  const earned = earnedCourses(records).filter((course) => allowedSource(sheet, course.courseNo));
  const byCode = new Map(decisions.filter((d) => d.sheetId === sheet.id).map((d) => [subjectCode(d.fromCode), d]));
  function evaluateSubject(item: Subject): SubjectResult {
    let best: number | undefined;
    for (const course of earned) {
      const decision = byCode.get(course.courseNo);
      if (decision ? decision.target !== item.title : !item.codes.includes(course.courseNo)) continue;
      const value = Math.min(course.credits, decision?.credits ?? course.credits);
      best = Math.max(best ?? 0, value);
    }
    const routes = (item.alternatives ?? []).map((route) => route.map(evaluateSubject));
    if (routes.some((parts) => parts.every((part) => part.passed))) best = Math.max(best ?? 0, item.credits);
    const credited = item.actual ? best ?? 0 : Math.min(best ?? 0, item.credits);
    return { ...item, credited, routes, passed: best !== undefined && credited >= item.credits };
  }
  const results = sheet.groups.map((group) => ({ group, rows: group.subjects.map(evaluateSubject) }));
  const allPassed = new Set(results.flatMap(({ rows }) => rows.filter((r) => r.passed).map((r) => r.title)));
  const matched = pairedLabs(sheet.groups.flatMap((g) => g.subjects).filter((s) => s.pairedWith), allPassed);
  return results.map(({ group, rows }) => {
    const eligibleRows = rows.map((row) => (
      row.pairedWith && !matched.has(row.title) ? { ...row, passed: false, credited: 0 } : row
    ));
    let confirmed = 0;
    let capped = 0;
    if (group.manual) {
      const { target, eligible, cappedCodes, cap } = group.manual;
      for (const course of earned) {
        const decision = byCode.get(course.courseNo);
        if (!eligibleTarget(group, course.courseNo) ||
          (decision ? decision.target !== target : !eligible?.includes(course.courseNo))) continue;
        const credit = Math.min(course.credits, decision?.credits ?? course.credits);
        if (group.mode === "subjects") confirmed++;
        else if (cappedCodes?.includes(course.courseNo)) capped += credit;
        else confirmed += credit;
      }
      confirmed += Math.min(capped, cap ?? capped);
    }
    const achieved = confirmed + (group.mode === "credits" ? eligibleRows.reduce((sum, row) => sum + row.credited, 0) :
      eligibleRows.filter((row) => row.passed).length);
    const remaining = Math.max(0, group.minimum - achieved);
    const missingCredits = group.mode === "credits" ? remaining : eligibleRows.filter((row) => !row.passed)
      .map((row) => Math.max(0, row.credits - row.credited)).sort((a, b) => a - b)
      .slice(0, remaining).reduce((sum, value) => sum + value, 0);
    const areas = new Set(eligibleRows.filter((r) => r.passed && r.area !== undefined).map((r) => r.area)).size;
    return { ...group, rows: eligibleRows, achieved, remaining, missingCredits, areas, confirmed,
      complete: remaining === 0 && areas >= (group.minAreas ?? 0) };
  });
}
