import { z } from "zod";
const text = z.string().trim().max(255).default("");
export const awardSchema = z.object({
  name: z.string().trim().min(2).max(255),
  award_type: z.string().trim().min(2).max(255),
  affiliation: text,
  email: z.union([z.email().max(255), z.literal("")]).default(""),
  content: text,
  linkedin: text,
  researchgate: text,
  academia: text,
  google_scholar: text,
  orcid: text,
  profile_photo: text,
  status: z.union([z.literal(0), z.literal(1), z.null()]),
});
export const awardUrlFields = [
  "linkedin",
  "researchgate",
  "academia",
  "google_scholar",
  "profile_photo",
] as const;
