export default function IssueAuditDate({ value }: { value: string | null }) {
  if (!value) return <>—</>;
  // MySQL DATETIME is a recorded wall-clock value, not a UTC instant.
  const parts = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(
    value,
  );
  if (!parts) return <>{value}</>;
  const [, year, month, day, hour, minute, second] = parts;
  const h = Number(hour);
  return (
    <time dateTime={value.replace(" ", "T")}>
      {Number(month)}/{Number(day)}/{year}, {h % 12 || 12}:{minute}:{second}{" "}
      {h >= 12 ? "PM" : "AM"}
    </time>
  );
}
