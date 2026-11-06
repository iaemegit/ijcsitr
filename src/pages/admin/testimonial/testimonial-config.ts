import type { ContentConfig } from "../../../components/admin/content-types";
export const testimonialConfig: ContentConfig = {
  key: "testimonial",
  title: "Testimonial",
  singular: "testimonial",
  id: "id",
  create: true,
  status: true,
  fileField: "photo_url",
  fileType: "image",
  fileLabel: "Profile Photo",
  description:
    "Maintain testimonials, contributor details and approval status.",
  columns: ["name", "affiliation", "designation", "message", "status"],
  search: ["name", "affiliation", "designation", "message"],
  fields: [
    { key: "name", label: "Name", required: true },
    { key: "affiliation", label: "Affiliation" },
    { key: "designation", label: "Designation" },
    { key: "email", label: "Email", type: "email" },
    {
      key: "message",
      label: "Testimonial",
      type: "textarea",
      required: true,
      max: 5000,
    },
  ],
};
