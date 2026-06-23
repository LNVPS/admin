import clsx from "clsx";
import type React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "success" | "ghost" | "ghost-danger" | "ghost-success";
  size?: "xs" | "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-semibold rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 transition-colors cursor-pointer";

  const variantStyles = {
    // primary maps to lnvps neon green — needs dark text for contrast
    primary: "bg-blue-500 text-slate-950 hover:bg-blue-400 focus-visible:ring-blue-500",
    secondary: "bg-slate-700 text-white hover:bg-slate-600 focus-visible:ring-slate-500 border border-slate-600",
    // Literal light label (not `text-white`, which flips to dark in light mode) so it
    // stays readable on the saturated fill in both themes.
    danger: "bg-red-600 text-[#fafafa] hover:bg-red-500 focus-visible:ring-red-500",
    success: "bg-green-600 text-[#fafafa] hover:bg-green-500 focus-visible:ring-green-500",
    // Subtle, low-noise variants for dense table action cells.
    ghost:
      "bg-transparent text-slate-300 border border-slate-600/70 hover:bg-slate-700 hover:text-white focus-visible:ring-slate-500",
    "ghost-danger":
      "bg-transparent text-red-400 border border-red-500/30 hover:bg-red-500/10 hover:text-red-300 focus-visible:ring-red-500",
    "ghost-success":
      "bg-transparent text-green-400 border border-green-500/30 hover:bg-green-500/10 hover:text-green-300 focus-visible:ring-green-500",
  };

  const sizeStyles = {
    xs: "px-2 py-1 text-xs gap-1",
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  const disabledStyles = "opacity-50 cursor-not-allowed";

  return (
    <button
      className={clsx(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        (disabled || isLoading) && disabledStyles,
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className={clsx("h-4 w-4 animate-spin", children ? (size === "xs" ? "mr-1" : "mr-2") : "")}
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
            role="presentation"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {children ?? "Loading..."}
        </>
      ) : (
        <>
          {leftIcon && <span className={size === "xs" ? "mr-1" : "mr-2"}>{leftIcon}</span>}
          {children}
          {rightIcon && <span className={size === "xs" ? "ml-1" : "ml-2"}>{rightIcon}</span>}
        </>
      )}
    </button>
  );
}

interface IconButtonProps extends ButtonProps {
  icon: React.ReactNode;
  label: string;
}

export function IconButton({ icon, label, ...props }: IconButtonProps) {
  return (
    <Button {...props} className="p-2" aria-label={label}>
      {icon}
    </Button>
  );
}
