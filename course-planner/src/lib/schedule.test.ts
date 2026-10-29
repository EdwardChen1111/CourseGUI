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
    expect(parseScheduleSlots("M6、R10、二6X")).toEqual({
      meetings: [
        { weekday: "M", period: "6" },
        { weekday: "R", period: "10" },
      ],
      unrecognizedSlots: ["二6X"],
    });
  });
  it("reads historical Chinese weekday notation and lowercase evening slots without guessing malformed tokens", () => {
    expect(parseScheduleSlots("三78；四10a", ["教室甲", "教室乙"]).meetings).toEqual([
      { weekday: "W", period: "7", location: "教室甲" }, { weekday: "W", period: "8", location: "教室甲" },
      { weekday: "R", period: "10", location: "教室乙" }, { weekday: "R", period: "A", location: "教室乙" },
    ]);
    expect(parseScheduleSlots("五010A,U73").unrecognizedSlots).toEqual(["五010A", "U73"]);
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
