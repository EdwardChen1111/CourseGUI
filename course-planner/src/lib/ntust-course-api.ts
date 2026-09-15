import type { CourseOffering, CourseSnapshot } from "@/lib/course";
import { parseScheduleSlots } from "@/lib/schedule";

export const NTUST_COURSE_API_URL = "https://querycourse.ntust.edu.tw/querycourse/api/courses";

export type NtustCourseApiRecord = {
  Semester?: string;
  CourseNo?: string;
  CourseName?: string;
  CourseTeacher?: string;
  CreditPoint?: string | number;
  RequireOption?: string;
  AllYear?: string;
  ChooseStudent?: number;
  AllStudent?: number;
  ClassRoomNo?: string;
  Node?: string;
  Contents?: string;
  ThreeNode?: string | null;
  Dimension?: string;
};

export type CourseSnapshotDiff = {
  addedCourseNos: string[];
  removedCourseNos: string[];
  changedCourseNos: string[];
};

export type MappedNtustCourse = {
  offering: CourseOffering;
  unrecognizedScheduleTokens: string[];
};

function splitValues(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[、,，/\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function mapRequiredType(value: string | undefined): CourseOffering["requiredType"] {
  if (value === "R") return "required";
  if (value === "E") return "elective";
  return "unknown";
}

function mapYearType(value: string | undefined): CourseOffering["yearType"] {
  if (value === "F" || value === "A") return "full";
  if (value === "H") return "half";
  return "unknown";
}

/**
 * Converts one public NTUST API record to the app's versioned snapshot shape.
 * The API does not expose a per-record update time, so the sync retrieval time
 * is kept on each offering as its traceable source timestamp.
 */
export function mapNtustCourse(record: NtustCourseApiRecord, retrievedAt: string): MappedNtustCourse {
  const courseNo = record.CourseNo?.trim();
  const title = record.CourseName?.trim();
  const semester = record.Semester?.trim();
  const credits = Number(record.CreditPoint);

  if (!courseNo || !title || !semester || record.CreditPoint == null || !Number.isFinite(credits) || credits < 0) {
    throw new Error(`Cannot map incomplete NTUST course record: ${courseNo ?? "missing course number"}`);
  }

  const parsedSchedule = parseScheduleSlots((courseNo.startsWith("3") ? record.ThreeNode ?? record.Node : record.Node) ?? "", splitValues(record.ClassRoomNo));
  const instructors = splitValues(record.CourseTeacher);

  return {
    offering: {
      semester,
      courseNo,
      title,
      credits,
      requiredType: mapRequiredType(record.RequireOption),
      yearType: mapYearType(record.AllYear),
      instructors: instructors.length > 0 ? instructors : ["未提供"],
      enrollmentText:
        typeof record.ChooseStudent === "number" && typeof record.AllStudent === "number"
          ? `本校已選 ${record.ChooseStudent}／總已選 ${record.AllStudent}`
          : undefined,
      meetings: parsedSchedule.meetings,
      notes: record.Contents?.trim() || undefined,
      sourceUpdatedAt: retrievedAt,
      dimension: record.Dimension?.trim() || undefined,
      hasUnrecognizedSchedule: parsedSchedule.unrecognizedSlots.length > 0,
    },
    unrecognizedScheduleTokens: parsedSchedule.unrecognizedSlots,
  };
}

/**
 * The public API emits one row per meeting pattern, while registration uses one
 * course number. Merge those rows only after validating their course metadata.
 */
export function combineNtustCourseOfferings(mappedCourses: MappedNtustCourse[]): MappedNtustCourse[] {
  const grouped = new Map<string, MappedNtustCourse[]>();
  mappedCourses.forEach((mappedCourse) => {
    const group = grouped.get(mappedCourse.offering.courseNo) ?? [];
    group.push(mappedCourse);
    grouped.set(mappedCourse.offering.courseNo, group);
  });

  return [...grouped.values()].map((group) => {
    const [first, ...remaining] = group;
    const identity = JSON.stringify({
      semester: first.offering.semester,
      courseNo: first.offering.courseNo,
      title: first.offering.title,
      credits: first.offering.credits,
      requiredType: first.offering.requiredType,
      yearType: first.offering.yearType,
    });
    if (remaining.some((item) => JSON.stringify({
      semester: item.offering.semester,
      courseNo: item.offering.courseNo,
      title: item.offering.title,
      credits: item.offering.credits,
      requiredType: item.offering.requiredType,
      yearType: item.offering.yearType,
    }) !== identity)) {
      throw new Error(`Conflicting metadata for course ${first.offering.courseNo}`);
    }

    const meetings = group.flatMap((item) => item.offering.meetings).filter(
      (meeting, index, allMeetings) =>
        allMeetings.findIndex((candidate) =>
          candidate.weekday === meeting.weekday && candidate.period === meeting.period && candidate.location === meeting.location,
        ) === index,
    );
    const notes = [...new Set(group.map((item) => item.offering.notes).filter(Boolean))].join("\n") || undefined;

    return {
      offering: { ...first.offering, meetings, notes, instructors: [...new Set(group.flatMap((item) => item.offering.instructors))], hasUnrecognizedSchedule: group.some((item) => item.offering.hasUnrecognizedSchedule) },
      unrecognizedScheduleTokens: group.flatMap((item) => item.unrecognizedScheduleTokens),
    };
  });
}

function offeringFingerprint(offering: CourseOffering): string {
  return JSON.stringify({
    title: offering.title,
    credits: offering.credits,
    requiredType: offering.requiredType,
    yearType: offering.yearType,
    instructors: offering.instructors,
    enrollmentText: offering.enrollmentText,
    meetings: offering.meetings,
    notes: offering.notes,
  });
}

/** Compares content only; retrieval timestamps never create a false course change. */
export function calculateCourseSnapshotDiff(previous: CourseSnapshot, next: CourseSnapshot): CourseSnapshotDiff {
  const previousOfferings = new Map(previous.offerings.map((offering) => [offering.courseNo, offering]));
  const nextOfferings = new Map(next.offerings.map((offering) => [offering.courseNo, offering]));

  const addedCourseNos = [...nextOfferings.keys()].filter((courseNo) => !previousOfferings.has(courseNo)).sort();
  const removedCourseNos = [...previousOfferings.keys()].filter((courseNo) => !nextOfferings.has(courseNo)).sort();
  const changedCourseNos = [...nextOfferings.entries()]
    .filter(([courseNo, offering]) => {
      const previousOffering = previousOfferings.get(courseNo);
      return previousOffering && offeringFingerprint(previousOffering) !== offeringFingerprint(offering);
    })
    .map(([courseNo]) => courseNo)
    .sort();

  return { addedCourseNos, removedCourseNos, changedCourseNos };
}
