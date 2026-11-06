export default function affiliationLabel(affiliation: {
  aff_name?: string | null;
  country?: string | null;
}) {
  return (
    affiliation.aff_name?.trim() ||
    (affiliation.country
      ? `${affiliation.country} (country only)`
      : "Country-only affiliation")
  );
}
