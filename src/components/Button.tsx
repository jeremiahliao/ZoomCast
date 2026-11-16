import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "default" | "provider";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const baseStyles = [
  "inline-flex items-center justify-center gap-2.5",
  "rounded-[var(--radius-md)] border border-[var(--color-border)]",
  "bg-[var(--color-surface-subtle)] px-3 py-1.5",
  "text-sm font-medium text-[var(--color-text)]",
  "cursor-pointer transition-colors duration-150 ease-in-out",
  "hover:bg-[var(--color-surface-hover)] motion-reduce:duration-0",
].join(" ");

const variantStyles: Record<ButtonVariant, string> = {
  default: "",
  provider:
    "mt-6 bg-[var(--color-surface)] px-5 py-2.5 text-[15px] shadow-[var(--shadow-card)]",
};

export function Button({
  variant = "default",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`.trim()}
      {...props}
    />
  );
}
