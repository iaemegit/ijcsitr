import type { ContentConfig } from "../../../components/admin/content-types";
export const contactUsConfig: ContentConfig = {
  key: "contact-us",
  title: "Contact Us",
  singular: "message",
  id: "id",
  create: false,
  description:
    "Review contact messages received through the journal’s public contact form.",
  columns: ["name", "email_id", "subject", "message", "created_date"],
  search: ["name", "email_id", "subject", "message"],
  fields: [
    { key: "name", label: "Name", required: true },
    { key: "email_id", label: "Email", type: "email", required: true },
    { key: "mobile_number", label: "Mobile Number" },
    { key: "subject", label: "Subject", required: true },
    {
      key: "message",
      label: "Message",
      type: "textarea",
      required: true,
      max: 255,
    },
  ],
};
