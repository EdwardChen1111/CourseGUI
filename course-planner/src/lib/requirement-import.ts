import type { RequirementSet } from "@/lib/requirements";

export type RequirementSetDiff = {
  metadataChanged: boolean;
  addedGroupIds: string[];
  removedGroupIds: string[];
  changedGroupIds: string[];
};

function stableCourseNos(courseNos: string[] | undefined): string[] {
  return [...(courseNos ?? [])].sort();
}

function groupFingerprint(group: RequirementSet["groups"][number]): string {
  return JSON.stringify({
    name: group.name,
    minimumCredits: group.minimumCredits,
    requiredCourseNos: stableCourseNos(group.requiredCourseNos),
    creditEligibleCourseNos: stableCourseNos(group.creditEligibleCourseNos),
    notes: group.notes,
  });
}

function metadataFingerprint(requirements: RequirementSet): string {
  return JSON.stringify({
    id: requirements.id,
    category: requirements.category,
    departmentCode: requirements.departmentCode,
    departmentName: requirements.departmentName,
    entryYear: requirements.entryYear,
    degreeType: requirements.degreeType,
    version: requirements.version,
    sourceUrl: requirements.sourceUrl,
    sourceTitle: requirements.sourceTitle,
    reviewStatus: requirements.reviewStatus,
    reviewedBy: requirements.reviewedBy,
    reviewedAt: requirements.reviewedAt,
    reviewNotes: requirements.reviewNotes,
  });
}

/**
 * Compares requirement content without treating a later retrieval timestamp or
 * a reordered list of eligible course numbers as a substantive change.
 */
export function calculateRequirementSetDiff(previous: RequirementSet, next: RequirementSet): RequirementSetDiff {
  const previousGroups = new Map(previous.groups.map((group) => [group.id, group]));
  const nextGroups = new Map(next.groups.map((group) => [group.id, group]));

  const addedGroupIds = [...nextGroups.keys()].filter((groupId) => !previousGroups.has(groupId)).sort();
  const removedGroupIds = [...previousGroups.keys()].filter((groupId) => !nextGroups.has(groupId)).sort();
  const changedGroupIds = [...nextGroups.entries()]
    .filter(([groupId, group]) => {
      const previousGroup = previousGroups.get(groupId);
      return previousGroup && groupFingerprint(previousGroup) !== groupFingerprint(group);
    })
    .map(([groupId]) => groupId)
    .sort();

  return {
    metadataChanged: metadataFingerprint(previous) !== metadataFingerprint(next),
    addedGroupIds,
    removedGroupIds,
    changedGroupIds,
  };
}
