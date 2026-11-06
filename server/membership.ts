import { Router } from "express";
import { z } from "zod";
import path from "node:path";
import { prisma } from "../src/lib/prisma";
import { query, serializeDatabase } from "./db";
import { safeUrl } from "./content";
import { membershipSchema, membershipUrlFields } from "./membership-schema";
import {
  parseMembershipPhoto,
  saveMembershipPhoto,
  removeUnusedMembershipPhoto,
  MembershipPhotoError,
  membershipPhotoDirectory,
  membershipPhotoPattern,
} from "./membership-upload";
export const memberships = Router();
const idSchema = z.coerce.number().int().positive().max(2147483647);
memberships.get("/", async (req, res) => {
  const { q, page, limit, status } = z
    .object({
      q: z.string().trim().max(200).default(""),
      page: z.coerce.number().int().min(1).max(100000).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(10),
      status: z.enum(["0", "1"]).optional(),
    })
    .parse(req.query);
  const clauses: string[] = [],
    params: unknown[] = [];
  if (q) {
    const term = "%" + q.replace(/[!%_]/g, (c) => "!" + c) + "%";
    clauses.push(
      "(name LIKE ? ESCAPE '!' OR affiliation LIKE ? ESCAPE '!' OR membership_type LIKE ? ESCAPE '!' OR email LIKE ? ESCAPE '!' OR CAST(membership_year AS CHAR)=? OR CAST(membership_id AS CHAR)=?)",
    );
    params.push(term, term, term, term, q, q);
  }
  if (status !== undefined) {
    clauses.push("status=?");
    params.push(Number(status));
  }
  const where = clauses.length ? "WHERE " + clauses.join(" AND ") : "";
  const [members, count] = await Promise.all([
    query(
      `SELECT * FROM membership ${where} ORDER BY membership_id DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      params,
    ),
    query(`SELECT COUNT(*) total FROM membership ${where}`, params),
  ]);
  res.json({ members, total: count[0].total, page, limit });
});
memberships.get("/photos/:filename", (req, res) => {
  const filename = req.params.filename;
  if (typeof filename !== "string" || !membershipPhotoPattern.test(filename))
    return res.sendStatus(404);
  res.set({
    "Content-Type": "image/webp",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  });
  res.sendFile(path.join(membershipPhotoDirectory, filename), (error) => {
    if (error && !res.headersSent) res.sendStatus(404);
  });
});
memberships.get("/:id", async (req, res) => {
  const member = await prisma.membership.findUnique({
    where: { membership_id: idSchema.parse(req.params.id) },
  });
  if (!member) return res.status(404).json({ error: "Membership not found." });
  res.json({ member: serializeDatabase(member) });
});
async function save(req, res) {
  const id = req.params.id ? idSchema.parse(req.params.id) : null,
    original = id
      ? await prisma.membership.findUnique({ where: { membership_id: id } })
      : null;
  if (id && !original)
    return res.status(404).json({ error: "Membership not found." });
  const data = membershipSchema.parse(req.body);
  for (const field of membershipUrlFields)
    if (
      data[field] &&
      data[field] !== original?.[field] &&
      !safeUrl(data[field])
    )
      return res
        .status(400)
        .json({
          error: "Enter valid HTTP or HTTPS profile URLs.",
          fields: { [field]: ["Enter an HTTP or HTTPS URL."] },
        });
  if (original && !Object.hasOwn(req.body, "photo"))
    data.photo = original.photo || "";
  let uploaded: string | undefined;
  try {
    uploaded = await saveMembershipPhoto(req.file);
    if (uploaded) data.photo = uploaded;
    if (id) {
      const result = await prisma.membership.updateMany({
        where: { membership_id: id },
        data: {
          ...data,
          updated_date: new Date(),
          updated_userid: req.adminUser.user_id,
          updated_usertype: 1,
        },
      });
      if (!result.count) {
        await removeUnusedMembershipPhoto(uploaded);
        return res.status(404).json({ error: "Membership not found." });
      }
      if (uploaded) await removeUnusedMembershipPhoto(original?.photo);
      return res.json({ id, message: "Membership updated." });
    }
    const member = await prisma.membership.create({
      data: {
        ...data,
        created_date: new Date(),
        created_userid: req.adminUser.user_id,
        created_usertype: 1,
      },
    });
    res
      .status(201)
      .json({ id: member.membership_id, message: "Membership created." });
  } catch (error) {
    await removeUnusedMembershipPhoto(uploaded);
    if (error instanceof MembershipPhotoError)
      return res.status(400).json({ error: error.message });
    throw error;
  }
}
memberships.post("/", parseMembershipPhoto, save);
memberships.put("/:id", parseMembershipPhoto, save);
memberships.delete("/:id", async (req, res) => {
  const id = idSchema.parse(req.params.id),
    original = await prisma.membership.findUnique({
      where: { membership_id: id },
      select: { photo: true },
    });
  const result = await prisma.membership.deleteMany({
    where: { membership_id: id },
  });
  if (!result.count)
    return res.status(404).json({ error: "Membership not found." });
  await removeUnusedMembershipPhoto(original?.photo);
  res.json({ message: "Membership deleted." });
});
