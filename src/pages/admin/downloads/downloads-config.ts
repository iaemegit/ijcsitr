import type { ContentConfig } from "../../../components/admin/content-types";
export const downloadsConfig: ContentConfig = {
  key: "downloads",
  title: "Downloads",
  singular: "download",
  id: "id",
  create: true,
  status: true,
  fileField: "file_url",
  fileType: "pdf",
  fileLabel: "Download File (PDF)",
  description: "Maintain journal documents and downloadable resources.",
  columns: ["title", "description", "status", "created_date"],
  search: ["title", "description"],
  fields: [
    { key: "title", label: "Title", required: true },
    { key: "description", label: "Description", type: "textarea", max: 5000 },
  ],
};
