import type { ContentConfig } from "../../../components/admin/content-types";
export const onlinePapersConfig: ContentConfig = {
  key: "online-papers",
  title: "Online Papers",
  singular: "submission",
  id: "abs_id",
  create: false,
  status: true,
  fileField: "upload_manuscript",
  fileType: "pdf",
  fileLabel: "Manuscript (PDF)",
  description:
    "Review submitted manuscripts and maintain their submission details. This does not publish an article.",
  columns: ["article_title", "author_name", "email", "country", "status"],
  search: ["article_title", "author_name", "email", "country", "keywords"],
  fields: [
    { key: "article_title", label: "Article Title", required: true, max: 500 },
    { key: "author_name", label: "Author Name", required: true },
    { key: "email", label: "Email", type: "email", required: true },
    { key: "mobile_number", label: "Mobile Number", max: 20 },
    { key: "country", label: "Country", type: "country" },
    { key: "discipline_title", label: "Discipline" },
    { key: "keywords", label: "Keywords", type: "textarea", max: 2000 },
  ],
};
