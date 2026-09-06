// Lab mascot — an animated Erlenmeyer flask with a friendly face.
// Used in empty states and as a tiny inline loader. Pure SVG + CSS
// keyframes (globals.css), no JS animation library, no images.
// All motion respects prefers-reduced-motion (see globals.css).

export function FlaskMascot({
  size = 96,
  mood = "wave",
  className = "",
}: {
  size?: number;
  mood?: "wave" | "sleep" | "happy" | "sad";
  className?: string;
}) {
  return (
    <div className={`flask-mascot ${mood} ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 120 120" fill="none" className="w-full h-full">
        {/* gentle bob for the whole flask */}
        <g className="flask-bob">
          {/* liquid */}
          <path
            className="flask-liquid"
            d="M38 78c0 9.94 9.85 18 22 18s22-8.06 22-18c0-2.61-.57-5.09-1.61-7.33L68 45h-16l-12.39 25.67A14.77 14.77 0 0 0 38 78Z"
            fill="#5CC8F2"
            opacity="0.9"
          />
          {/* bubble 1 */}
          <circle className="flask-bubble" cx="48" cy="80" r="2.5" fill="#fff" opacity="0.85" />
          {/* bubble 2 */}
          <circle className="flask-bubble b2" cx="58" cy="88" r="2" fill="#fff" opacity="0.7" />
          {/* bubble 3 */}
          <circle className="flask-bubble b3" cx="67" cy="76" r="1.6" fill="#fff" opacity="0.6" />
          {/* flask body outline */}
          <path
            d="M38 78c0 9.94 9.85 18 22 18s22-8.06 22-18c0-2.61-.57-5.09-1.61-7.33L68 45h-16l-12.39 25.67A14.77 14.77 0 0 0 38 78Z"
            fill="none"
            stroke="#1A5F7A"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* neck */}
          <path d="M52 45V24a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v21" fill="none" stroke="#1A5F7A" strokeWidth="3" strokeLinecap="round" />
          {/* rim */}
          <path d="M50 20h20" stroke="#1A5F7A" strokeWidth="3.5" strokeLinecap="round" />
          {/* face */}
          <g className="flask-face">
            {/* eyes */}
            <circle cx="53" cy="66" r="3" fill="#11303D" />
            <circle cx="67" cy="66" r="3" fill="#11303D" />
            {/* sparkle */}
            <circle cx="54.2" cy="64.8" r="0.9" fill="#fff" />
            <circle cx="68.2" cy="64.8" r="0.9" fill="#fff" />
            {/* smile — path varies per mood via CSS stroke-dasharray? simpler: swap path */}
            <Mouth mood={mood} />
            {/* blush */}
            <circle cx="48" cy="71" r="3" fill="#FF9DB5" opacity="0.7" />
            <circle cx="72" cy="71" r="3" fill="#FF9DB5" opacity="0.7" />
          </g>
        </g>
        {/* waving arm when mood=wave */}
        {mood === "wave" && (
          <g className="flask-arm">
            <path
              d="M84 60c2.2-4.5 6.8-6.4 10.5-4.9 3.2 1.3 4.6 4.9 3.3 8-1 2.5-3.3 3.8-5.6 4.5"
              stroke="#1A5F7A"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="94" cy="56" r="4.5" fill="#5CC8F2" stroke="#1A5F7A" strokeWidth="2.5" />
          </g>
        )}
        {mood === "sleep" && (
          <g stroke="#1A5F7A" strokeWidth="2.2" strokeLinecap="round" opacity="0.7">
            <path d="M84 62l5 4-5 4" fill="none" />
          </g>
        )}
        {mood === "sad" && (
          <g stroke="#1A5F7A" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.8">
            <path d="M60 92c-3-2-6-2-9 0" />
            <circle cx="42" cy="78" r="1.6" fill="#11303D" opacity="0.5" stroke="none" />
            <circle cx="78" cy="78" r="1.6" fill="#11303D" opacity="0.5" stroke="none" />
          </g>
        )}
      </svg>
    </div>
  );
}

function Mouth({ mood }: { mood: "wave" | "sleep" | "happy" | "sad" }) {
  if (mood === "sleep") {
    return <path d="M56 74q4 2.4 8 0" stroke="#11303D" strokeWidth="2" strokeLinecap="round" fill="none" />;
  }
  if (mood === "sad") {
    return <path d="M56 78q4-3 8 0" stroke="#11303D" strokeWidth="2" strokeLinecap="round" fill="none" />;
  }
  // happy / wave — open smile
  return <path d="M54 72q6 6.4 12 0" stroke="#11303D" strokeWidth="2.2" strokeLinecap="round" fill="none" />;
}

/** Tiny inline flask spinner for pending buttons/actions. */
export function FlaskSpinner({ size = 18 }: { size?: number }) {
  return (
    <span className="flask-spinner inline-block align-[-3px]" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
        <path
          d="M9 20.5c-2.21 0-4-1.9-4-4.25 0-.55.11-1.08.32-1.57L8.5 9h7l3.18 5.68c.21.49.32 1.02.32 1.57 0 2.35-1.79 4.25-4 4.25-1.1 0-2.1-.47-2.82-1.23A3.86 3.86 0 0 1 9 20.5Z"
          fill="#fff"
          opacity="0.25"
        />
        <path
          d="M11.5 9v-4a1 1 0 0 1 1-1 1 1 0 0 1 1 1v4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path d="M10.5 8.6h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
      </svg>
    </span>
  );
}
