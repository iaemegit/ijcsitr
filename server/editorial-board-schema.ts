import { z } from "zod";
const text = z.string().trim().max(255).default("");
export const editorialBoardSchema = z.object({
  prefix: z.string().trim().max(50).default(""),
  editor_name: z.string().trim().min(2).max(255),
  editor_affiliation: z.string().trim().min(2).max(5000),
  editor_type: z.string().trim().min(2).max(255),
  editor_email: z.union([z.email(), z.literal("")]).default(""),
  member_key: text,
  orcid_link: text,
  google_scholar_profile: text,
  institutional_profile: text,
  linkedin: text,
  profile_link: text,
  profile_photo: text,
  publon_link: text,
  research_gate_profile: text,
  scopus_author_id: text,
  status: z.union([z.literal(0), z.literal(1), z.null()]),
});
export const editorialProfileFields = [
  "orcid_link",
  "google_scholar_profile",
  "institutional_profile",
  "linkedin",
  "profile_link",
  "profile_photo",
  "publon_link",
  "research_gate_profile",
] as const;
