export const awardFields = [
  ["name", "Name", "e.g., Dr. Jane Smith"],
  ["affiliation", "Affiliation", "e.g., Institute of Advanced Studies"],
  ["email", "Email", "e.g., jane.smith@example.com"],
  ["award_type", "Award Type", "e.g., Lifetime Achievement"],
  [
    "content",
    "Content",
    "e.g., For outstanding contributions to research and education.",
  ],
  ["linkedin", "LinkedIn", "e.g., https://www.linkedin.com/in/janesmith"],
  [
    "researchgate",
    "ResearchGate",
    "e.g., https://www.researchgate.net/profile/Jane-Smith",
  ],
  ["academia", "Academia", "e.g., https://jane-smith.academia.edu"],
  [
    "google_scholar",
    "Google Scholar",
    "e.g., https://scholar.google.com/citations?user=example",
  ],
  ["orcid", "ORCID", "e.g., 0000-0002-1825-0098"],
] as const;
export interface AwardRecord {
  id: number;
  [key: string]: string | number | null;
}
