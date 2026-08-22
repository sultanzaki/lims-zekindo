export default function SectionLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`text-[11px] font-semibold text-muted tracking-wider uppercase ${className}`}>
      {children}
    </div>
  );
}
