import { buttonClass, type ButtonVariant, type ButtonSize } from "./buttonStyles";

export default function Button({
  variant = "primary",
  size = "md",
  fullWidth = true,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}) {
  return <button className={buttonClass(variant, size, fullWidth, className)} {...props} />;
}
