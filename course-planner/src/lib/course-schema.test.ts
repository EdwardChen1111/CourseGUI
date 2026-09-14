import { describe, expect, it } from "vitest";

import snapshot from "@/data/courses/1151.json";
import { parseCourseSnapshot } from "@/lib/course-data";

describe("parseCourseSnapshot", () => {
  it("accepts the versioned 1151 official course snapshot", () => {
    const parsedSnapshot = parseCourseSnapshot(snapshot);
    expect(parsedSnapshot.offerings).toHaveLength(48);
    expect(parsedSnapshot.scope).toEqual({ type: "filtered-query", description: "1151 學期「微積分」課名篩選結果" });
  });

  it("rejects a course that belongs to another semester", () => {
    const invalidSnapshot = structuredClone(snapshot);
    invalidSnapshot.offerings[0].semester = "1142";

    expect(() => parseCourseSnapshot(invalidSnapshot)).toThrow("offering semester must match snapshot semester");
  });
});
