"use client";
import { useRef, useState } from "react";
import { useAdmin } from "../../../context/AdminContext";
import adminApi from "../../../services/adminApi";
export type ArticleUpload = { token: string; name: string; link: string };
export default function ArticleDocumentField({
  kind,
  savedPath,
  savedLink,
  displayPath,
  uploaded,
  disabled,
  onUploaded,
  onDelete,
  onBusy,
}: {
  kind: "pdf" | "word";
  savedPath: string;
  savedLink: string;
  displayPath?: string;
  uploaded: ArticleUpload | null;
  disabled: boolean;
  onUploaded: (upload: ArticleUpload) => void;
  onDelete: () => void;
  onBusy: (value: boolean) => void;
}) {
  const { session } = useAdmin();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const title = kind === "pdf" ? "PDF" : "Word";
  const attached = !!(uploaded || savedPath);
  const link = uploaded?.link || savedLink;
  async function upload() {
    if (!file) {
      setError(`Choose a ${title} file first.`);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Choose a file no larger than 10 MB.");
      return;
    }
    setBusy(true);
    onBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      onUploaded(
        await adminApi(`/articles/uploads/${kind}`, {
          method: "POST",
          csrfToken: session?.csrfToken,
          body,
        }),
      );
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <div className="article-pdf-panel">
      <label className="form-label" htmlFor={`article-${kind}`}>
        Article File ({title}){kind === "pdf" ? " *" : " (optional)"}
      </label>
      <div className="d-flex gap-2 align-items-start">
        <input
          ref={input}
          id={`article-${kind}`}
          className="form-control"
          type="file"
          accept={
            kind === "pdf"
              ? ".pdf,application/pdf"
              : ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          }
          disabled={disabled || busy || attached}
          onChange={(event) => {
            setFile(event.target.files?.[0] || null);
            setError("");
          }}
        />
        <button
          type="button"
          className="btn btn-outline-primary text-nowrap"
          disabled={disabled || busy || attached || !file}
          onClick={upload}
        >
          {busy ? "Uploading..." : `Upload ${title}`}
        </button>
      </div>
      <small className="article-field-hint">
        Maximum 10 MB.
        {kind === "word"
          ? " Word .doc or .docx files."
          : " Choose the file, then click Upload PDF before saving."}
      </small>
      {attached && (
        <div className="mt-3">
          <label className="form-label" htmlFor={`article-${kind}-path`}>
            {uploaded && !displayPath
              ? `Uploaded ${title} file`
              : `Current ${title} path / link`}
          </label>
          <input
            id={`article-${kind}-path`}
            className="form-control"
            readOnly
            value={displayPath || uploaded?.name || savedPath}
          />
          {uploaded && (
            <small className="text-success d-block mt-2" role="status">
              {title} uploaded. Save the article to attach it.
            </small>
          )}
          <div className="d-flex gap-2 flex-wrap mt-3">
            {link && (
              <a
                href={link}
                className="btn btn-sm btn-outline-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open {title}
              </a>
            )}
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              disabled={disabled || busy}
              onClick={() => {
                if (input.current) input.current.value = "";
                setFile(null);
                setError("");
                onDelete();
              }}
            >
              Delete {title}
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="text-danger small mt-2 mb-0" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
