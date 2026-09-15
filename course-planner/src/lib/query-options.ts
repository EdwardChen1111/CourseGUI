export const campusOptions = [
  ["Main_Campus", "校本部"], ["Hwa_Hsia_Campus", "華夏校區"], ["Hsinchu_Campus", "新竹校區"],
] as const;
export const teachingOptions = [
  ["eng", "英語授課"], ["cot", "業師"], ["PBL", "PBL課程"], ["DLC", "遠距課程"],
  ["ITC", "創新教學課程"], ["EMI", "EMI課程"], ["Intensive", "密集上課"],
] as const;
export const categoryOptions = [
  ["all", "所有課程"], ["general", "通識課程"], ["PE", "體育課程"],
  ["LCC", "國文課程"], ["foreign", "外語課程"], ["EP", "師資培育課程"],
] as const;
export type QueryCatalog = {
  retrievedAt: string;
  semesters: Array<{ semester: string; label: string; file: string; count: number }>;
  unavailableSemesters?: Array<{ semester: string; label: string; reason: string; checkedAt: string }>;
  colleges: Array<{ code: string; name: string }>;
  departments: Array<{ code: string; name: string; college: string }>;
  dimensions: Array<{ code: string; name: string }>;
};
