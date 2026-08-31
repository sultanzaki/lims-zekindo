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
    <div className={`bg-white border border-border rounded-[18px] md:rounded-2xl shadow-card ${padded ? "p-4 md:p-3.5" : ""} ${className}`}>
      {children}
    </div>
  );
}
