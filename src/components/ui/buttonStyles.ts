export type ButtonVariant = "primary" | "secondary" | "outlineDanger" | "success" | "ghost";
export type ButtonSize = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-1.5 font-semibold rounded-[10px] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-dark",
  secondary: "bg-white text-text border border-border hover:bg-chip-bg",
  outlineDanger: "bg-white text-danger border border-danger/40 hover:bg-danger-bg",
  success: "bg-success text-white hover:bg-success-dark",
  ghost: "bg-chip-bg text-text hover:bg-border-soft",
};

const sizes: Record<ButtonSize, string> = {
  md: "text-[14px] py-3 px-5",
  sm: "text-xs py-2 px-3.5",
};

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  fullWidth = true,
  extra = ""
) {
  return [base, variants[variant], sizes[size], fullWidth ? "w-full" : "", extra].filter(Boolean).join(" ");
}
