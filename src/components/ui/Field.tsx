export const inputClass =
  "text-sm px-3.5 py-2.5 border border-border rounded-[8px] text-text bg-white w-full placeholder:text-faint";

export const inputClassSm =
  "text-xs px-3 py-2 border border-border rounded-[8px] text-text bg-white w-full placeholder:text-faint";

export default function Field({
  label,
  htmlFor,
  hint,
  error,
  className = "",
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-xs font-semibold text-text" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && !error && <div className="text-[11px] text-muted">{hint}</div>}
      {error && <div className="text-[11px] text-danger">{error}</div>}
    </div>
  );
}
