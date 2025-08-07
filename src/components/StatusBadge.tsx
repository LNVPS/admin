interface StatusBadgeProps {
  status:
    | "enabled"
    | "disabled"
    | "running"
    | "stopped"
    | "expired"
    | "active"
    | "inactive"
    | "unknown";
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
        return "bg-yellow-900 text-yellow-300";
      default:
        return "bg-gray-900 text-gray-300";
    }
  };

  const getStatusText = (status: StatusBadgeProps["status"]) => {
    switch (status) {
      case "enabled":
        return "Enabled";
      case "disabled":
        return "Disabled";
      case "running":
        return "Running";
      case "stopped":
        return "Stopped";
      case "expired":
        return "Expired";
      case "active":
        return "Active";
      case "inactive":
        return "Inactive";
      case "unknown":
        return "Unknown";
      default:
        return status;
    }
  };

  return (
    <span
      className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getStatusStyles(status)} ${className}`}
    >
      {children || getStatusText(status)}
    </span>
  );
}
