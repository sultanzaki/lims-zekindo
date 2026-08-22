import Link from "next/link";
import { buttonClass, type ButtonVariant, type ButtonSize } from "./buttonStyles";

export default function LinkButton({
  variant = "primary",
  size = "md",
  fullWidth = true,
  className = "",
  href,
  children,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, fullWidth, `text-center ${className}`)}>
      {children}
    </Link>
  );
}
