import { describe, expect, it } from "vitest";

import { getConflictingMeetings, hasScheduleConflict, parseScheduleSlots } from "@/lib/schedule";

describe("parseScheduleSlots", () => {
  it("parses comma-separated course query time slots and aligns locations", () => {
    expect(parseScheduleSlots("T9,W6,W7,F6,F7", ["TR-515", "TR-515"]).meetings).toEqual([
      { weekday: "T", period: "9", location: "TR-515" },
      { weekday: "W", period: "6", location: "TR-515" },
      { weekday: "W", period: "7" },
      { weekday: "F", period: "6" },
      { weekday: "F", period: "7" },
    ]);
  });

  it("records unknown formats instead of treating them as valid NTUST schedule slots", () => {
    expect(parseScheduleSlots("M6、R10、二67")).toEqual({
      meetings: [
        { weekday: "M", period: "6" },
        { weekday: "R", period: "10" },
      ],
      unrecognizedSlots: ["二67"],
    });
  });
});

describe("hasScheduleConflict", () => {
  it("finds the overlapping weekday and period", () => {
    const left = parseScheduleSlots("T6,T7,R6").meetings;
    const right = parseScheduleSlots("W6,R6,R7").meetings;

    expect(hasScheduleConflict(left, right)).toBe(true);
    expect(getConflictingMeetings(left, right)).toEqual([{ weekday: "R", period: "6" }]);
  });

  it("does not flag adjacent or distinct meetings", () => {
    expect(hasScheduleConflict(parseScheduleSlots("M6").meetings, parseScheduleSlots("M7").meetings)).toBe(false);
  });
});
