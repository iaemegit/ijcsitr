export const boardRoles = [
  "Editor-in-Chief",
  "Associate Editor",
  "Editorial Board Member",
];
export const boardFields = {
  prefix: "Prefix",
  editor_name: "Editor Name",
  editor_affiliation: "Affiliation",
  editor_type: "Editor Type",
  editor_email: "Email",
  member_key: "Member Key",
  orcid_link: "ORCID URL",
  google_scholar_profile: "Google Scholar Profile",
  institutional_profile: "Institutional Profile",
  linkedin: "LinkedIn URL",
  profile_link: "Profile URL",
  profile_photo: "Profile Photo URL",
  publon_link: "Publons URL",
  research_gate_profile: "ResearchGate Profile",
  scopus_author_id: "Scopus Author ID",
};
export type BoardValues = Record<keyof typeof boardFields, string> & {
  status: number | null;
};
export type BoardMember = BoardValues & {
  member_id: number;
  journal_id: number;
  created_date?: string;
  updated_date?: string;
};
