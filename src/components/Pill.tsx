import React from "react";

interface PillProps {
  children: React.ReactNode;
  variant?:
    | "default"
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "danger";
  size?: "sm" | "md";
  className?: string;
}

const variantClasses = {
  default: "bg-gray-700 text-gray-300",
  primary: "bg-blue-900 text-blue-300",
  secondary: "bg-purple-900 text-purple-300",
  success: "bg-green-900 text-green-300",
  warning: "bg-yellow-900 text-yellow-300",
  danger: "bg-red-900 text-red-300",
};

const sizeClasses = {
  sm: "px-2 py-1 text-xs",
  md: "px-2 py-1 text-sm",
};

export function Pill({
  children,
  variant = "default",
  size = "sm",
  className = "",
}: PillProps) {
  return (
    <span
      className={`inline-flex items-center rounded font-medium ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </span>
  );
}
