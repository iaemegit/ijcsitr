import { z } from "zod";
import { journalHtml } from "./journal-content";
import { plain } from "./content";
const text = z.string().trim().max(255).default("");
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Select a valid date.")
  .refine((value) => {
    const parsed = new Date(value + "T00:00:00Z");
    return (
      Number.isFinite(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Select a valid calendar date.");
const optionalDate = z.union([date, z.literal(""), z.null()]).default(null);
export const articleSchema = z
  .object({
    article_title: z.string().trim().min(3).max(255),
    article_key: text,
    issue_id: z
      .number()
      .int()
      .positive()
      .max(Number.MAX_SAFE_INTEGER)
      .nullable(),
    author_ids: z
      .array(z.number().int().positive().max(Number.MAX_SAFE_INTEGER))
      .min(1, "Select at least one author.")
      .max(50),
    corresponding_author: text,
    abstract: z
      .string()
      .trim()
      .max(50000)
      .transform((value) => journalHtml(value) || "")
      .refine(
        (value) => plain(value).length >= 10,
        "Enter an abstract of at least 10 characters.",
      ),
    keywords: z.string().trim().max(5000).default(""),
    reference: z
      .string()
      .max(100000)
      .default("")
      .transform((value) => journalHtml(value) || ""),
    copyright: z.string().max(20000).nullable().default(null),
    doi: text,
    google_scholar: text,
    article_file: z.string().trim().max(255).nullable().default(null),
    article_word_file: z.string().trim().max(255).nullable().optional(),
    pdf_upload_token: z.string().uuid().optional(),
    word_upload_token: z.string().uuid().optional(),
    date_of_publication: date,
    date_of_received: optionalDate,
    date_of_acceptance: optionalDate,
    page_from: text,
    page_to: text,
    status: z.union([z.literal(0), z.literal(1), z.null()]),
  })
  .superRefine((value, ctx) => {
    if (new Set(value.author_ids).size !== value.author_ids.length)
      ctx.addIssue({
        code: "custom",
        path: ["author_ids"],
        message: "Select each author only once.",
      });
    if (JSON.stringify(value.author_ids).length > 255)
      ctx.addIssue({
        code: "custom",
        path: ["author_ids"],
        message: "The selected author IDs exceed the article storage limit.",
      });
    if (
      value.corresponding_author &&
      /^\d+$/.test(value.corresponding_author) &&
      !value.author_ids.includes(Number(value.corresponding_author))
    )
      ctx.addIssue({
        code: "custom",
        path: ["corresponding_author"],
        message: "Select a corresponding author from the article authors.",
      });
    if (
      value.date_of_received &&
      value.date_of_acceptance &&
      value.date_of_received > value.date_of_acceptance
    )
      ctx.addIssue({
        code: "custom",
        path: ["date_of_acceptance"],
        message: "Acceptance must be on or after receipt.",
      });
    if (
      (value.date_of_acceptance &&
        value.date_of_acceptance > value.date_of_publication) ||
      (value.date_of_received &&
        value.date_of_received > value.date_of_publication)
    )
      ctx.addIssue({
        code: "custom",
        path: ["date_of_publication"],
        message: "Publication must be on or after receipt and acceptance.",
      });
    if (
      /^\d+$/.test(value.page_from) &&
      /^\d+$/.test(value.page_to) &&
      Number(value.page_to) < Number(value.page_from)
    )
      ctx.addIssue({
        code: "custom",
        path: ["page_to"],
        message: "Last page must be on or after first page.",
      });
  });
