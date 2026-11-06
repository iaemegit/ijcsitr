export const months = [
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
];
export interface CallForPaperRecord {
  call_id: number;
  issue_month: string;
  issue_year: string;
  deadline: string;
  dispatch_month: string;
  dispatch_year: string;
  dispatch_date: string;
  file: string | null;
  status: number;
  created_userid: number | null;
  created_date: string;
  updated_userid: number | null;
  updated_date: string | null;
}
