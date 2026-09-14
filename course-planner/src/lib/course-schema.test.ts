import { describe, expect, it } from "vitest";

import snapshot from "@/data/courses/1151.json";
import { parseCourseSnapshot } from "@/lib/course-data";

describe("parseCourseSnapshot", () => {
  it("accepts the versioned 1151 course snapshot", () => {
    expect(parseCourseSnapshot(snapshot).offerings).toHaveLength(2);
  });

  it("rejects a course that belongs to another semester", () => {
    const invalidSnapshot = structuredClone(snapshot);
    invalidSnapshot.offerings[0].semester = "1142";

    expect(() => parseCourseSnapshot(invalidSnapshot)).toThrow("offering semester must match snapshot semester");
  });
});
