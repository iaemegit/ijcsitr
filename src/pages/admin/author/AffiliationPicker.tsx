"use client";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import affiliationLabel from "../../../utils/affiliationLabel";
import AffiliationSearchDialog from "./AffiliationSearchDialog";
export default function AffiliationPicker({
  selected,
  affiliations,
  onChange,
  onRemove,
  department,
  onDepartmentChange,
  disabled,
  error,
}) {
  const [query, setQuery] = useState<any>(
      selected?.aff_name || selected?.country || "",
    ),
    [open, setOpen] = useState(false);
  const timer = useRef<any>(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  function show() {
    clearTimeout(timer.current);
    setOpen(true);
  }
  return (
    <div className="col-12 author-affiliation-picker">
      <label className="form-label" htmlFor="author-affiliation-search">
        Affiliation <span className="text-danger">*</span>
      </label>
      <div className="input-group">
        <input
          id="author-affiliation-search"
          className="form-control"
          placeholder="Enter Affiliation ID, name, university or address"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            clearTimeout(timer.current);
            if (event.target.value.trim())
              timer.current = setTimeout(() => setOpen(true), 400);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              show();
            }
          }}
          disabled={disabled}
          maxLength={5000}
        />
        <button
          type="button"
          className="btn btn-outline-primary author-search-button"
          onClick={show}
          disabled={disabled}
        >
          <Search size={16} /> Search
        </button>
      </div>
      {affiliations.length > 0 && (
        <div className="author-affiliation-selection-note">
          <span>
            {affiliations.length}{" "}
            {affiliations.length === 1 ? "affiliation" : "affiliations"}{" "}
            selected · Only the primary affiliation is displayed
          </span>
          <button
            type="button"
            className="btn btn-link"
            disabled={disabled}
            onClick={() => {
              setQuery("");
              show();
            }}
          >
            Manage affiliations
          </button>
        </div>
      )}
      {selected && (
        <div className="author-selected-affiliation">
          <div className="author-selected-heading">
            <div>
              <strong>
                {affiliationLabel(selected)}{" "}
                <span className="badge author-primary-badge">Primary</span>
              </strong>
              <p>{selected.address}</p>
              <p>
                {selected.country}
                {selected.aff_id ? ` (${selected.aff_id})` : ""}
              </p>
            </div>
            <button
              type="button"
              className="btn icon-button text-danger"
              aria-label="Remove selected affiliation"
              onClick={() => {
                onRemove();
                setQuery("");
              }}
              disabled={disabled}
            >
              <X size={18} />
            </button>
          </div>
          <div className="author-selected-department">
            <label className="form-label" htmlFor="author-department">
              Department
            </label>
            <input
              id="author-department"
              className="form-control"
              value={department}
              onChange={(event) => onDepartmentChange(event.target.value)}
              maxLength={5000}
              disabled={disabled}
            />
          </div>
        </div>
      )}
      {error && (
        <p className="text-danger author-field-error" role="alert">
          {error}
        </p>
      )}
      {open && (
        <AffiliationSearchDialog
          query={query.slice(0, 200)}
          affiliations={affiliations}
          primary={selected}
          onClose={() => setOpen(false)}
          onApply={(items, primaryId) => {
            const primary = items.find(
              (item) => (item.aff_id ?? "legacy") === primaryId,
            );
            onChange(items, primary);
            setQuery(primary.aff_name || primary.country || "");
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
