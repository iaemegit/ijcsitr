function formatDate(value: string | null | undefined) {
  const datePart = value?.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (!datePart) return "Date unavailable";
  const date = new Date(datePart + "T00:00:00Z");
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
}
export default formatDate;
