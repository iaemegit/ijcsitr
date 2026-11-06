import { z } from "zod";
export const callMonths = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
const year = z
  .string()
  .regex(/^\d{4}$/, "Select a four-digit year.")
  .refine((value) => Number(value) >= 1900, "Select a year from 1900 onward.");
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
export const callForPaperSchema = z
  .object({
    issue_month: z.enum(callMonths),
    issue_year: year,
    deadline: date,
    dispatch_month: z.enum(callMonths),
    dispatch_year: year,
    dispatch_date: date,
    file: z.string().trim().max(2000).default(""),
    status: z.union([z.literal(0), z.literal(1)]),
  })
  .refine((value) => value.dispatch_date >= value.deadline, {
    path: ["dispatch_date"],
    message: "Dispatch date must be on or after the submission deadline.",
  });
