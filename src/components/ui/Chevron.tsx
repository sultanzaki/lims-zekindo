export default function Chevron({ color = "#C2D2DB" }: { color?: string }) {
  return (
    <svg width="8" height="14" viewBox="0 0 8 14" className="shrink-0">
      <path d="M1 1l6 6-6 6" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
