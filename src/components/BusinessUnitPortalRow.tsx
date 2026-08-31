"use client";

import { useState } from "react";
import {
  enableBusinessUnitPortalAction,
  regenerateBusinessUnitPortalTokenAction,
  disableBusinessUnitPortalAction,
} from "@/lib/actions/catalog";

function WhatsAppIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
      <path d="M12.02 2C6.5 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.07L2 22l5.08-1.33A9.96 9.96 0 0012.02 22C17.54 22 22 17.52 22 12S17.54 2 12.02 2zm0 18.13a8.1 8.1 0 01-4.14-1.14l-.3-.18-3.02.79.8-2.94-.19-.3a8.1 8.1 0 01-1.24-4.32c0-4.48 3.65-8.13 8.13-8.13 4.48 0 8.13 3.65 8.13 8.13 0 4.49-3.65 8.09-8.17 8.09zm4.44-6.08c-.24-.12-1.44-.71-1.67-.79-.22-.08-.38-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.44-1.35-1.68-.14-.24-.02-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.81-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.13 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28z" />
    </svg>
  );
}

export default function BusinessUnitPortalRow({
  buId,
  buName,
  portalUrl,
}: {
  buId: string;
  buName: string;
  portalUrl: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const [confirmingRegen, setConfirmingRegen] = useState(false);

  if (!portalUrl) {
    return (
      <form action={enableBusinessUnitPortalAction.bind(null, buId)}>
        <button type="submit" className="text-[11px] font-semibold text-primary cursor-pointer whitespace-nowrap">
          Enable Client Portal
        </button>
      </form>
    );
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    `Hi, here is the sample portal link for ${buName} at Zekindo Chemicals Lab:\n\n${portalUrl}`
  )}`;

  return (
    <div className="flex flex-col gap-1.5 items-end">
      <div className="flex items-center gap-3 flex-wrap justify-end">
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(portalUrl).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
          className="text-[11px] font-semibold text-primary cursor-pointer whitespace-nowrap"
        >
          {copied ? "Copied ✓" : "Copy link"}
        </button>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#25D366] whitespace-nowrap"
        >
          <WhatsAppIcon />
          Share
        </a>
        {confirmingRegen ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted whitespace-nowrap">Invalidate old link?</span>
            <form
              action={regenerateBusinessUnitPortalTokenAction.bind(null, buId)}
              onSubmit={() => setConfirmingRegen(false)}
            >
              <button type="submit" className="text-[11px] font-semibold text-danger cursor-pointer whitespace-nowrap">
                Confirm
              </button>
            </form>
            <button
              type="button"
              onClick={() => setConfirmingRegen(false)}
              className="text-[11px] font-semibold text-muted cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingRegen(true)}
            className="text-[11px] font-semibold text-muted cursor-pointer whitespace-nowrap"
          >
            Regenerate
          </button>
        )}
      </div>
      <form action={disableBusinessUnitPortalAction.bind(null, buId)}>
        <button type="submit" className="text-[10px] font-medium text-faint cursor-pointer whitespace-nowrap">
          Disable portal
        </button>
      </form>
    </div>
  );
}
