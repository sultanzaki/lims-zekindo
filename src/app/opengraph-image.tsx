import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const logoPath = join(process.cwd(), "public", "zekindo-logo.png");
  const logoBase64 = readFileSync(logoPath).toString("base64");
  const logoSrc = `data:image/png;base64,${logoBase64}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#F4F7F9",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <img src={logoSrc} alt="Zekindo Chemicals" width={520} height={174} />
        <div style={{ marginTop: 28, fontSize: 30, fontWeight: 600, color: "#1A5F7A", letterSpacing: -0.5 }}>
          Laboratory Information Management System
        </div>
      </div>
    ),
    { ...size }
  );
}
