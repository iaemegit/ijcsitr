import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { query, serializeDatabase } from "./db";
import { currentJournal } from "./journal";
import { safeUrl } from "./content";
import path from "node:path";
import {
  parseBoardPhoto,
  saveBoardPhoto,
  removeUnusedBoardPhoto,
  BoardPhotoError,
  boardPhotoDirectory,
  boardPhotoPattern,
} from "./editorial-board-upload";
import {
  editorialBoardSchema,
  editorialProfileFields,
} from "./editorial-board-schema";
export const editorialBoard = Router();
const idSchema = z.coerce.number().int().positive().max(2147483647);
editorialBoard.get("/", async (req, res) => {
  const { q, page, limit, status } = z
    .object({
      q: z.string().trim().max(200).default(""),
      page: z.coerce.number().int().min(1).max(100000).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(10),
      status: z.enum(["0", "1"]).optional(),
    })
    .parse(req.query);
  const journal = await currentJournal();
  if (!journal) return res.status(404).json({ error: "Journal not found." });
  const clauses = ["journal_id=?"],
    params: unknown[] = [journal.journal_id];
  if (q) {
    const term = "%" + q.replace(/[!%_]/g, (c) => "!" + c) + "%";
    clauses.push(
      "(editor_name LIKE ? ESCAPE '!' OR editor_affiliation LIKE ? ESCAPE '!' OR editor_type LIKE ? ESCAPE '!' OR CAST(member_id AS CHAR)=?)",
    );
    params.push(term, term, term, q);
  }
  if (status !== undefined) {
    clauses.push("status=?");
    params.push(Number(status));
  }
  const where = "WHERE " + clauses.join(" AND ");
  const [members, count] = await Promise.all([
    query(
      `SELECT * FROM editorial_board ${where} ORDER BY CASE editor_type WHEN 'Editor-in-Chief' THEN 0 WHEN 'Associate Editor' THEN 1 ELSE 2 END,editor_name,member_id LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      params,
    ),
    query(`SELECT COUNT(*) total FROM editorial_board ${where}`, params),
  ]);
  res.json({
    members,
    total: count[0].total,
    page,
    limit,
    journal: {
      journal_id: journal.journal_id,
      journal_name: journal.journal_name,
    },
  });
});
editorialBoard.get("/options", async (req, res) => {
  const journal = await currentJournal();
  if (!journal) return res.status(404).json({ error: "Journal not found." });
  res.json({
    journal: {
      journal_id: journal.journal_id,
      journal_name: journal.journal_name,
    },
  });
});
editorialBoard.get("/photos/:filename", (req, res) => {
  const filename = req.params.filename;
  if (typeof filename !== "string" || !boardPhotoPattern.test(filename))
    return res.sendStatus(404);
  res.set({
    "Content-Type": "image/webp",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  });
  res.sendFile(path.join(boardPhotoDirectory, filename), (error) => {
    if (error && !res.headersSent) res.sendStatus(404);
  });
});
editorialBoard.get("/:id", async (req, res) => {
  const journal = await currentJournal();
  if (!journal) return res.status(404).json({ error: "Journal not found." });
  const member = await prisma.editorial_board.findFirst({
    where: {
      member_id: idSchema.parse(req.params.id),
      journal_id: journal.journal_id,
    },
  });
  if (!member)
    return res.status(404).json({ error: "Board member not found." });
  res.json({ member: serializeDatabase(member) });
});
async function save(req, res) {
  const journal = await currentJournal();
  if (!journal) return res.status(404).json({ error: "Journal not found." });
  const id = req.params.id ? idSchema.parse(req.params.id) : null;
  const original = id
    ? await prisma.editorial_board.findFirst({
        where: { member_id: id, journal_id: journal.journal_id },
      })
    : null;
  if (id && !original)
    return res.status(404).json({ error: "Board member not found." });
  const data = editorialBoardSchema.parse(req.body);
  for (const field of editorialProfileFields)
    if (
      data[field] &&
      data[field] !== original?.[field] &&
      !safeUrl(data[field])
    )
      return res.status(400).json({
        error: "Enter valid HTTP or HTTPS profile URLs.",
        fields: { [field]: ["Enter an HTTP or HTTPS URL."] },
      });
  // The form hides existing legacy photo paths and keys, so preserve them on edit.
  if (original && !Object.hasOwn(req.body, "profile_photo"))
    data.profile_photo = original.profile_photo || "";
  let uploaded: string | undefined;
  try {
    uploaded = await saveBoardPhoto(req.file);
    if (uploaded) data.profile_photo = uploaded;
    if (id) {
      const result = await prisma.editorial_board.updateMany({
        where: { member_id: id, journal_id: journal.journal_id },
        data: {
          ...data,
          updated_date: new Date(),
          updated_userid: req.adminUser.user_id,
          updated_usertype: 1,
        },
      });
      if (!result.count) {
        await removeUnusedBoardPhoto(uploaded);
        return res.status(404).json({ error: "Board member not found." });
      }
      if (uploaded) await removeUnusedBoardPhoto(original?.profile_photo);
      return res.json({ id, message: "Board member updated." });
    }
    const member = await prisma.editorial_board.create({
      data: {
        ...data,
        member_key: data.member_key || randomUUID(),
        journal_id: journal.journal_id,
        created_date: new Date(),
        created_userid: req.adminUser.user_id,
        created_usertype: 1,
      },
    });
    res
      .status(201)
      .json({ id: member.member_id, message: "Board member created." });
  } catch (error) {
    await removeUnusedBoardPhoto(uploaded);
    if (error instanceof BoardPhotoError)
      return res.status(400).json({ error: error.message });
    throw error;
  }
}
editorialBoard.post("/", parseBoardPhoto, save);
editorialBoard.put("/:id", parseBoardPhoto, save);
editorialBoard.delete("/:id", async (req, res) => {
  const journal = await currentJournal();
  if (!journal) return res.status(404).json({ error: "Journal not found." });
  const original = await prisma.editorial_board.findFirst({
    where: {
      member_id: idSchema.parse(req.params.id),
      journal_id: journal.journal_id,
    },
    select: { profile_photo: true },
  });
  const result = await prisma.editorial_board.deleteMany({
    where: {
      member_id: idSchema.parse(req.params.id),
      journal_id: journal.journal_id,
    },
  });
  if (!result.count)
    return res.status(404).json({ error: "Board member not found." });
  await removeUnusedBoardPhoto(original?.profile_photo);
  res.json({ message: "Board member deleted." });
});
