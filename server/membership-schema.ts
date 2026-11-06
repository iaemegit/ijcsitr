import { z } from "zod";
const text = z.string().trim().max(255).default("");
export const membershipSchema = z.object({
  membership_type: z.string().trim().min(2).max(255),
  membership_year: z.number().int().min(1900).max(9999),
  name: z.string().trim().min(2).max(255),
  email: z.email().max(255),
  affiliation: text,
  specialization: text,
  mobile_number: text,
  google_scholar_link: text,
  researchgate_link: text,
  academia_link: text,
  orcid: text,
  ssrn: text,
  github: text,
  institution_profile_link: text,
  scopus_link: text,
  wos_link: text,
  photo: text,
  status: z.union([z.literal(0), z.literal(1), z.null()]),
});
export const membershipUrlFields = [
  "google_scholar_link",
  "researchgate_link",
  "academia_link",
  "ssrn",
  "github",
  "institution_profile_link",
  "scopus_link",
  "wos_link",
  "photo",
] as const;
