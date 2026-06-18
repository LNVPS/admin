interface StatusBadgeProps {
  status:
    | "enabled"
    | "disabled"
    | "running"
    | "stopped"
    | "expired"
    | "active"
    | "inactive"
    | "unknown"
    | "warning";
  children?: React.ReactNode;
  className?: string;
  colorOverride?: string;
}

export function StatusBadge({
  status,
  children,
  className = "",
  colorOverride,
}: StatusBadgeProps) {
  const getStatusStyles = (status: StatusBadgeProps["status"]) => {
    if (colorOverride) {
      return colorOverride;
    }

    switch (status) {
      case "enabled":
      case "running":
      case "active":
        return "border border-green-500/40 bg-green-500/10 text-green-400";
      case "disabled":
      case "stopped":
      case "inactive":
        return "border border-red-500/40 bg-red-500/10 text-red-400";
      case "expired":
        return "border border-orange-500/40 bg-orange-500/10 text-orange-400";
      case "unknown":
        return "border border-slate-600 bg-slate-700/40 text-slate-300";
      case "warning":
        return "border border-yellow-500/40 bg-yellow-500/10 text-yellow-400";
      default:
        return "border border-slate-600 bg-slate-700/40 text-slate-300";
    }
  };

  const getStatusText = (status: StatusBadgeProps["status"]) => {
    switch (status) {
      case "enabled":
        return "ENABLED";
      case "disabled":
        return "DISABLED";
      case "running":
        return "RUNNING";
      case "stopped":
        return "STOPPED";
      case "expired":
        return "EXPIRED";
      case "active":
        return "ACTIVE";
      case "inactive":
        return "INACTIVE";
      case "unknown":
        return "UNKNOWN";
      case "warning":
        return "WARNING";
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full ${getStatusStyles(status)} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children || getStatusText(status)}
    </span>
  );
}
