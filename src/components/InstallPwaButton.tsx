"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Chrome/Edge/Android only fire `beforeinstallprompt` when the PWA install
// criteria are already met (manifest + service worker + HTTPS) — this just
// captures that browser-native event so we can offer an in-app button
// instead of relying on someone noticing the address-bar icon. iOS has no
// equivalent event; there, "Add to Home Screen" stays a manual Safari step.
export default function InstallPwaButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches
  );

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || !deferredPrompt) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        setDeferredPrompt(null);
      }}
      className="flex items-center justify-between px-4 py-3.5 min-h-[52px] w-full text-left cursor-pointer border-b border-border-soft"
    >
      <span className="text-sm font-medium text-text">Install App</span>
      <span className="text-[11px] font-semibold text-primary">Add to Home Screen</span>
    </button>
  );
}
