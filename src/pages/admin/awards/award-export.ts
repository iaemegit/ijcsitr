import type { AwardRecord } from "./award-types";
export const awardColumns = [
  ["Name", "name"],
  ["Affiliation", "affiliation"],
  ["Email", "email"],
  ["Award Type", "award_type"],
  ["Content", "content"],
  ["Created User ID", "created_userid"],
  ["Created Date", "created_date"],
  ["Updated User ID", "updated_userid"],
  ["Updated Date", "updated_date"],
  ["Status", "status"],
] as const;
export function awardCell(member: AwardRecord, key: string) {
  if (key === "status")
    return member.status === 1
      ? "Active"
      : member.status === 0
        ? "Inactive"
        : "Not set";
  const value = member[key];
  if (value == null || value === "") return "";
  if (key.endsWith("_date")) {
    const date = new Date(String(value).replace(" ", "T"));
    if (!Number.isNaN(date.getTime())) return date.toLocaleString("en-US");
  }
  return String(value);
}
export function awardExportRows(members: AwardRecord[]) {
  return members.map((member, index) => [
    String(index + 1),
    ...awardColumns.map(([, key]) => awardCell(member, key)),
  ]);
}
export const awardExportHeaders = [
  "S.No",
  ...awardColumns.map(([label]) => label),
];
export function awardCsv(members: AwardRecord[]) {
  const quote = (value: string) =>
    '"' +
    (/^[\s]*[=+@-]/.test(value) ? "'" + value : value).replaceAll('"', '""') +
    '"';
  return (
    "\uFEFF" +
    [awardExportHeaders, ...awardExportRows(members)]
      .map((row) => row.map(quote).join(","))
      .join("\r\n")
  );
}
export function downloadAwardCsv(members: AwardRecord[]) {
  const url = URL.createObjectURL(
      new Blob([awardCsv(members)], { type: "text/csv;charset=utf-8" }),
    ),
    link = document.createElement("a");
  link.href = url;
  link.download = "awards.csv";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function downloadAwardPdf(members: AwardRecord[]) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ orientation: "landscape", format: "a3" });
  doc.setFontSize(16);
  doc.text("IJCSITR - Awards", 14, 16);
  autoTable(doc, {
    head: [awardExportHeaders],
    body: awardExportRows(members),
    startY: 23,
    styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: [30, 83, 91] },
    rowPageBreak: "avoid",
    margin: { left: 14, right: 14 },
  });
  doc.save("awards.pdf");
}
