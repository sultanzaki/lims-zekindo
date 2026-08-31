export const inputClass =
  "text-[15px] px-4 py-3.5 border-[1.5px] border-border rounded-[13px] text-text bg-white w-full placeholder:text-faint md:text-[13px] md:px-3.5 md:py-2.5 md:rounded-[10px]";

export const inputClassSm =
  "text-xs px-3 py-2.5 border-[1.5px] border-border rounded-[10px] text-text bg-white w-full placeholder:text-faint md:py-2 md:rounded-[8px]";

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
