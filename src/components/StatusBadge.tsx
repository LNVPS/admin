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
        return "bg-green-900 text-green-300";
      case "disabled":
      case "stopped":
      case "inactive":
        return "bg-red-900 text-red-300";
      case "expired":
        return "bg-orange-900 text-orange-300";
      case "unknown":
        return "bg-gray-900 text-gray-300";
      case "warning":
        return "bg-yellow-200 text-yellow-800";
      default:
        return "bg-gray-900 text-gray-300";
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
      default:
        return status.toUpperCase();
    }
  };

  return (
    <span
      className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${getStatusStyles(status)} ${className}`}
    >
      {children || getStatusText(status)}
    </span>
  );
}
