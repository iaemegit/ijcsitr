export type ContentField = {
  key: string;
  label: string;
  type?: "text" | "email" | "textarea" | "url" | "country";
  required?: boolean;
  max?: number;
};
export type ContentConfig = {
  key: string;
  title: string;
  singular: string;
  id: string;
  fields: ContentField[];
  columns: string[];
  search: string[];
  create: boolean;
  status?: boolean;
  fileField?: string;
  fileType?: "pdf" | "image";
  fileLabel?: string;
  description: string;
};
export type ContentRecord = Record<string, string | number | null>;
