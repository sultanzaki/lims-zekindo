"use client";

import { useEffect } from "react";

// Registers the service worker so the app is installable and gets an
// offline fallback for navigation — see public/sw.js for what it does (and
// deliberately doesn't) cache.
export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
