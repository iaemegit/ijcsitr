import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFile, unlink } from "node:fs/promises";
import {
  saveCallPdf,
  CallUploadError,
  callFilePrefix,
  callFileDirectory,
} from "./call-for-paper-upload.ts";
test("call announcements reject fake PDFs and store valid PDF uploads with generated names", async () => {
  await assert.rejects(
    () =>
      saveCallPdf({
        mimetype: "application/pdf",
        originalname: "fake.pdf",
        buffer: Buffer.from("fake"),
      }),
    CallUploadError,
  );
  const buffer = Buffer.from("%PDF-1.4\nTest announcement\n%%EOF"),
    url = await saveCallPdf({
      mimetype: "application/pdf",
      originalname: "call.pdf",
      buffer,
    });
  const filename = url.slice(callFilePrefix.length);
  assert.match(filename, /^[a-f0-9-]{36}\.pdf$/);
  const target = path.join(callFileDirectory, filename);
  try {
    assert.deepEqual(await readFile(target), buffer);
  } finally {
    await unlink(target);
  }
});
