"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions/samples";
import SectionLabel from "@/components/ui/SectionLabel";
import Button from "@/components/ui/Button";

type Report = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: Date;
  url: string | null;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2B8DB8" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

const initialState: FormState = {};

// Sample-level finished report documents (e.g. a signed-off PDF report),
// distinct from per-parameter TestAttachment working documentation shown
// inside each Results card — those are attached while a single test is
// still open, this is a document for the sample as a whole.
export default function SampleReportPanel({
  reports,
  canManage,
  canUpload,
  uploadAction,
  deleteAction,
}: {
  reports: Report[];
  canManage: boolean;
  canUpload: boolean;
  uploadAction: (prevState: FormState, formData: FormData) => Promise<FormState>;
  deleteAction: (reportId: string) => Promise<void>;
}) {
  const [state, formAction, pending] = useActionState(uploadAction, initialState);

  return (
    <div className="bg-white border border-border rounded-[18px] shadow-card p-[15px] flex flex-col gap-3">
      <SectionLabel>Report</SectionLabel>
      <p className="text-xs text-muted -mt-1">
        The finished report document for this sample — separate from the per-parameter documentation attached under each test.
      </p>

      {reports.length > 0 ? (
        <div className="flex flex-col gap-2">
          {reports.map((r) => (
            <div key={r.id} className="flex items-center gap-2.5 bg-page-bg border border-border-soft rounded-[12px] px-3 py-2.5">
              <FileIcon />
              <div className="flex-1 min-w-0">
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium text-primary truncate block">
                    {r.fileName}
                  </a>
                ) : (
                  <span className="text-[13px] font-medium text-faint truncate block">{r.fileName}</span>
                )}
                <div className="text-[11px] text-faint mt-0.5">
                  {formatBytes(r.fileSize)} · {r.uploadedBy}
                </div>
              </div>
              {canManage && (
                <form action={deleteAction.bind(null, r.id)}>
                  <button type="submit" className="text-[11px] font-semibold text-danger cursor-pointer shrink-0">
                    Remove
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-muted">No report uploaded yet.</div>
      )}

      {canUpload && (
        <form action={formAction} className="flex items-center gap-2 pt-1 border-t border-border-soft">
          <input
            type="file"
            name="file"
            required
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            className="flex-1 text-[11px] text-muted file:mr-2 file:py-1.5 file:px-2.5 file:rounded-full file:border-0 file:text-[11px] file:font-semibold file:bg-primary-soft file:text-primary-dark"
          />
          <Button type="submit" disabled={pending} size="sm" fullWidth={false} className="shrink-0 px-3.5">
            {pending ? "Uploading…" : "Upload"}
          </Button>
        </form>
      )}
      {state.error && <div className="text-[11px] font-medium text-danger">{state.error}</div>}
    </div>
  );
}
