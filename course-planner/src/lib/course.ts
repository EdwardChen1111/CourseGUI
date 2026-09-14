export const WEEKDAYS = ["M", "T", "W", "R", "F", "S", "U"] as const;
export const PERIODS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "A", "B", "C", "D"] as const;

export type Weekday = (typeof WEEKDAYS)[number];
export type Period = (typeof PERIODS)[number];

export type Meeting = {
  weekday: Weekday;
  period: Period;
  location?: string;
};

export type CourseOffering = {
  semester: string;
  courseNo: string;
  title: string;
  credits: number;
  requiredType: "required" | "elective" | "unknown";
  yearType: "full" | "half" | "unknown";
  instructors: string[];
  enrollmentText?: string;
  meetings: Meeting[];
  notes?: string;
  sourceUpdatedAt: string;
};

export type CourseSnapshot = {
  semester: string;
  source: string;
  retrievedAt: string;
  offerings: CourseOffering[];
};
