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
    <div className={`bg-white border border-border rounded-xl ${padded ? "p-4" : ""} ${className}`}>
      {children}
    </div>
  );
}
