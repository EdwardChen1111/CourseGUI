import sourceRequirements from "@/data/requirements/demo-1151.json";
import { requirementSetSchema } from "@/lib/requirements";

export const demoRequirementSet = requirementSetSchema.parse(sourceRequirements);
