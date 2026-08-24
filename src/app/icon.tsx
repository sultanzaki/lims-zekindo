import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1A5F7A",
          borderRadius: 14,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <span style={{ color: "#fff", fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>Z</span>
      </div>
    ),
    { ...size }
  );
}
