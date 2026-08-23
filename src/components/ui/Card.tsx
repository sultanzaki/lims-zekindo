export default function Card({
  className = "",
  children,
  padded = true,
}: {
  className?: string;
  children: React.ReactNode;
  padded?: boolean;
}) {
  return (
    <div className={`bg-white border border-border rounded-[18px] shadow-card ${padded ? "p-4" : ""} ${className}`}>
      {children}
    </div>
  );
}
