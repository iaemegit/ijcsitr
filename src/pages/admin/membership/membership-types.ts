export const membershipFields = [
  ["membership_type", "Membership Type", "e.g., Regular"],
  ["membership_year", "Membership Year", "Select Year"],
  ["name", "Name", "e.g., John Doe"],
  ["affiliation", "Affiliation", "e.g., University of Example"],
  ["specialization", "Specialization", "e.g., Artificial Intelligence"],
  [
    "google_scholar_link",
    "Google Scholar Link",
    "e.g., https://scholar.google.com/...",
  ],
  [
    "researchgate_link",
    "ResearchGate Link",
    "e.g., https://www.researchgate.net/...",
  ],
  ["academia_link", "Academia Link", "e.g., https://john-doe.academia.edu"],
  ["orcid", "ORCID", "e.g., 0000-0002-1825-0097"],
  ["ssrn", "SSRN", "e.g., https://ssrn.com/author=..."],
  ["github", "GitHub", "e.g., https://github.com/johndoe"],
  [
    "institution_profile_link",
    "Institution Profile Link",
    "e.g., https://university.example.edu/...",
  ],
  ["scopus_link", "Scopus Link", "e.g., https://www.scopus.com/..."],
  ["wos_link", "Web of Science Link", "e.g., https://www.webofscience.com/..."],
  ["email", "Email", "e.g., johndoe@example.com"],
  ["mobile_number", "Mobile Number", "e.g., +1234567890"],
] as const;
export interface MembershipMember {
  membership_id: number;
  [key: string]: string | number | null;
}
