"use client";
import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
export default function AdminDialog({
  title,
  description,
  children,
  onClose,
  busy = false,
}) {
  const ref = useRef<any>(null),
    titleId = useId(),
    descriptionId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = old;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="admin-dialog"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h2 id={titleId} className="modal-title">
              {title}
            </h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <button
            className="btn icon-button"
            aria-label="Close dialog"
            disabled={busy}
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
