export type ButtonVariant = "primary" | "secondary" | "outlineDanger" | "success" | "ghost";
export type ButtonSize = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-1.5 font-semibold rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.975]";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-dark shadow-glow-primary",
  secondary: "bg-white text-primary-dark border border-primary-soft hover:bg-primary-soft",
  outlineDanger: "bg-white text-danger border border-danger/30 hover:bg-danger-bg",
  success: "bg-success text-white hover:bg-success-dark",
  ghost: "bg-chip-bg text-text hover:bg-border-soft",
};

const sizes: Record<ButtonSize, string> = {
  md: "text-[15px] py-4 px-5 min-h-[50px] md:text-[13px] md:py-2.5 md:px-4 md:min-h-[38px]",
  sm: "text-xs py-2.5 px-4 min-h-[38px] md:py-2 md:px-3.5 md:min-h-[34px]",
};

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  fullWidth = true,
  extra = ""
) {
  return [base, variants[variant], sizes[size], fullWidth ? "w-full" : "", extra].filter(Boolean).join(" ");
}
