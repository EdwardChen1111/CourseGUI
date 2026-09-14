import { PERIODS, type Meeting, type Period, type Weekday, WEEKDAYS } from "@/lib/course";

const slotPattern = /^([MTWRFSU])(10|[1-9]|[ABCD])$/;

export type ParsedSchedule = {
  meetings: Meeting[];
  unrecognizedSlots: string[];
};

/** Parses the NTUST-style schedule tokens used by the course query site, such as `T6` or `R10`. */
export function parseScheduleSlots(value: string, locations: string[] = []): ParsedSchedule {
  const tokens = value
    .split(/[、,，\s]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const meetings: Meeting[] = [];
  const unrecognizedSlots: string[] = [];

  tokens.forEach((token, index) => {
    const match = token.match(slotPattern);
    if (!match) {
      unrecognizedSlots.push(token);
      return;
    }

    const weekday = match[1] as Weekday;
    const period = match[2] as Period;
    if (!WEEKDAYS.includes(weekday) || !PERIODS.includes(period)) {
      unrecognizedSlots.push(token);
      return;
    }

    const location = locations[index];
    meetings.push(location ? { weekday, period, location } : { weekday, period });
  });

  return { meetings, unrecognizedSlots };
}

export function getConflictingMeetings(left: Meeting[], right: Meeting[]): Meeting[] {
  const rightSlots = new Set(right.map((meeting) => `${meeting.weekday}${meeting.period}`));
  return left.filter((meeting) => rightSlots.has(`${meeting.weekday}${meeting.period}`));
}

export function hasScheduleConflict(left: Meeting[], right: Meeting[]): boolean {
  return getConflictingMeetings(left, right).length > 0;
}
