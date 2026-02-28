import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Event Watch — Smart Contract Event Listener";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
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
          background: "#0C0A09",
          fontFamily: "sans-serif",
        }}
      >
        {/* Subtle radial glow */}
        <div
          style={{
            position: "absolute",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(232,164,39,0.15) 0%, transparent 70%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -55%)",
          }}
        />

        {/* Radar icon */}
        <svg
          width="80"
          height="80"
          viewBox="0 0 18 18"
          fill="none"
          style={{ marginBottom: 32 }}
        >
          <path
            d="M9 1v16"
            stroke="#E8A427"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M1 9h16"
            stroke="#E8A427"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="9" cy="9" r="3" stroke="#E8A427" strokeWidth="1.5" />
          <circle
            cx="9"
            cy="9"
            r="7"
            stroke="#E8A427"
            strokeWidth="1"
            opacity="0.3"
          />
          <circle cx="9" cy="9" r="1" fill="#E8A427" />
        </svg>

        {/* Title */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "#FAFAF9",
            letterSpacing: "-0.02em",
            marginBottom: 12,
          }}
        >
          Event Watch
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 22,
            color: "#A8A29E",
            letterSpacing: "0.01em",
          }}
        >
          Decode smart contract events on Ethereum, Arbitrum &amp; Polygon
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            position: "absolute",
            bottom: 48,
            width: 200,
            height: 2,
            background:
              "linear-gradient(to right, transparent, #E8A427, transparent)",
            borderRadius: 1,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
