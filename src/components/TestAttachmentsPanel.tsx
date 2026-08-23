"use client";

import { useActionState, useRef } from "react";
import { uploadTestAttachmentAction, deleteTestAttachmentAction, type FormState } from "@/lib/actions/samples";
import SectionLabel from "@/components/ui/SectionLabel";

type Attachment = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: Date;
  url: string | null;
};

const initialState: FormState = {};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(fileType: string) {
  return fileType.startsWith("image/");
}

function FileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2B8DB8" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

export default function TestAttachmentsPanel({
  sampleId,
  testId,
  attachments,
}: {
  sampleId: string;
  testId: string;
  attachments: Attachment[];
}) {
  const boundUpload = uploadTestAttachmentAction.bind(null, sampleId, testId);
  const [state, formAction, pending] = useActionState(boundUpload, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-3">
      <SectionLabel>
        Attachments {attachments.length > 0 && `(${attachments.length})`}
      </SectionLabel>

      {attachments.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {attachments.map((a) => (
            <div key={a.id} className="flex items-center gap-2.5 bg-white border border-border rounded-[13px] px-3 py-2.5">
              {isImage(a.fileType) && a.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.url} alt={a.fileName} className="w-9 h-9 rounded-[8px] object-cover shrink-0 border border-border-soft" />
              ) : (
                <div className="w-9 h-9 rounded-[8px] bg-primary-soft flex items-center justify-center shrink-0">
                  <FileIcon />
                </div>
              )}
              <div className="flex-1 min-w-0">
                {a.url ? (
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary truncate block">
                    {a.fileName}
                  </a>
                ) : (
                  <div className="text-xs font-semibold text-text truncate">{a.fileName}</div>
                )}
                <div className="text-[11px] text-faint mt-0.5">
                  {formatBytes(a.fileSize)} · {a.uploadedBy}
                </div>
              </div>
              <form action={deleteTestAttachmentAction.bind(null, sampleId, testId, a.id)}>
                <button type="submit" className="text-[11px] font-semibold text-danger cursor-pointer shrink-0">
                  Remove
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      <form
        ref={formRef}
        action={(formData) => {
          formAction(formData);
          formRef.current?.reset();
        }}
        className="flex items-center gap-2.5"
      >
        <label className="flex-1 flex items-center gap-2 text-xs font-medium text-muted border border-dashed border-border rounded-[13px] px-3.5 py-3 cursor-pointer">
          <FileIcon />
          <span>Add photo or Excel/CSV file…</span>
          <input
            type="file"
            name="file"
            accept="image/jpeg,image/png,image/heic,image/webp,.xlsx,.xls,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) e.target.form?.requestSubmit();
            }}
          />
        </label>
        {pending && <span className="text-[11px] text-muted shrink-0">Uploading…</span>}
      </form>
      {state.error && <div className="text-[11px] text-danger">{state.error}</div>}
    </div>
  );
}
