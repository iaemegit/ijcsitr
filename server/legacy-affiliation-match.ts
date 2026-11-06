interface LegacyInstitution {
  university: string | null;
  address: string | null;
  country: string | null;
}
interface Institution {
  aff_id: number;
  aff_name: string;
  address: string | null;
  country: string | null;
}
const normalize = (value: string | null) =>
  String(value || "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en")
    .replace(/\.$/, "");
export function legacyAffiliationMatch(
  author: LegacyInstitution,
  affiliations: Institution[],
) {
  if (!normalize(author.university))
    return { match: null, candidates: [], reason: "No institution recorded" };
  const names = affiliations.filter(
    (aff) => normalize(aff.aff_name) === normalize(author.university),
  );
  const candidates = names.filter(
    (aff) =>
      normalize(aff.address) === normalize(author.address) &&
      normalize(aff.country) === normalize(author.country),
  );
  return {
    match: candidates.length === 1 ? candidates[0] : null,
    candidates: candidates.map((aff) => aff.aff_id),
    reason:
      candidates.length === 1
        ? "Unique institution name, address and country match"
        : candidates.length > 1
          ? "Multiple affiliations have the same name, address and country"
          : names.length
            ? "Institution name matches but address/country does not identify one affiliation"
            : "No matching affiliation",
  };
}
