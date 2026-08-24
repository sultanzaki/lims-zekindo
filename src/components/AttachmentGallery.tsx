"use client";

import { useState } from "react";

type Attachment = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string | null;
};

function isImageType(fileType: string) {
  return fileType.startsWith("image/");
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2B8DB8" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#93A6B0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 018 0v3" />
    </svg>
  );
}

// Photo documentation for a test, shown as a swipeable carousel with a tap-to-expand
// lightbox; Excel/CSV or other non-image files are listed separately and only made
// downloadable for Supervisor/QA/Admin, per the lab's documentation access rule.
export default function AttachmentGallery({
  attachments,
  canDownloadDocs,
}: {
  attachments: Attachment[];
  canDownloadDocs: boolean;
}) {
  const images = attachments.filter((a) => isImageType(a.fileType) && a.url);
  const docs = attachments.filter((a) => !(isImageType(a.fileType) && a.url));
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  return (
    <div className="flex flex-col gap-2">
      {images.length > 0 && (
        <div className="relative">
          <div
            className="flex gap-2 overflow-x-auto snap-x snap-mandatory rounded-[12px]"
            onScroll={(e) => {
              const el = e.currentTarget;
              const idx = Math.round(el.scrollLeft / el.clientWidth);
              if (idx !== carouselIndex) setCarouselIndex(idx);
            }}
          >
            {images.map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.id}
                src={img.url!}
                alt={img.fileName}
                onClick={() => setLightboxIndex(i)}
                className="w-full aspect-[4/3] object-cover rounded-[12px] shrink-0 snap-center cursor-zoom-in border border-border-soft"
              />
            ))}
          </div>
          {images.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-1.5">
              {images.map((img, i) => (
                <div
                  key={img.id}
                  className="rounded-full transition-all"
                  style={{
                    width: i === carouselIndex ? 14 : 5,
                    height: 5,
                    background: i === carouselIndex ? "#2B8DB8" : "#D6E4EC",
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {docs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {docs.map((a) => {
            const downloadable = canDownloadDocs && a.url;
            return downloadable ? (
              <a
                key={a.id}
                href={a.url!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-page-bg border border-border-soft rounded-[10px] px-2.5 py-1.5 max-w-[220px]"
              >
                <FileIcon />
                <span className="text-[11px] font-medium text-primary truncate">{a.fileName}</span>
                <span className="text-[10px] text-faint shrink-0">{formatBytes(a.fileSize)}</span>
              </a>
            ) : (
              <div
                key={a.id}
                title={canDownloadDocs ? undefined : "Only Supervisor/QA can download this file"}
                className="flex items-center gap-2 bg-page-bg border border-border-soft rounded-[10px] px-2.5 py-1.5 max-w-[220px] opacity-70"
              >
                {canDownloadDocs ? <FileIcon /> : <LockIcon />}
                <span className="text-[11px] font-medium text-faint truncate">{a.fileName}</span>
                {!canDownloadDocs && <span className="text-[10px] text-faint shrink-0">Supervisor/QA only</span>}
              </div>
            );
          })}
        </div>
      )}

      {lightboxIndex !== null && images[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center px-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setLightboxIndex(null)}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((i) => (i! - 1 + images.length) % images.length);
                }}
                className="absolute left-3 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Next"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((i) => (i! + 1) % images.length);
                }}
                className="absolute right-3 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[lightboxIndex].url!}
            alt={images[lightboxIndex].fileName}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[85vh] object-contain rounded-[8px]"
          />
        </div>
      )}
    </div>
  );
}
