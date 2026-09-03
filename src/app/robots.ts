import type { MetadataRoute } from "next";

// Backs up the per-page `robots: noindex` metadata with an actual
// /robots.txt — some crawlers check this before ever fetching a page's
// <head>. Nothing in this app (an authenticated LIMS plus a token-gated
// client portal) is meant to be publicly discoverable.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
