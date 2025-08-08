import { StatusBadge } from "./StatusBadge";
import { AdminVmInfo, VmRunningStates } from "../lib/api";

interface VmStatusBadgeProps {
  vm: AdminVmInfo;
  className?: string;
}

export function VmStatusBadge({ vm, className = "" }: VmStatusBadgeProps) {
  const getVmStatus = (vm: AdminVmInfo) => {
    // Check if VM is deleted first
    if (vm.deleted) {
      return "deleted";
    }

    // Check if VM is new (created == expires, indicating no payment received yet)
    if (vm.created === vm.expires) {
      return "new";
    }

    if (!vm?.running_state) {
      return "unknown";
    }
    return vm.running_state.state;
  };

  const getVmStatusBadgeColor = (vm: AdminVmInfo) => {
    const status = getVmStatus(vm);
    if (status === "deleted") return "stopped"; // Use red for deleted VMs
    if (status === "new") return "warning"; // Use light yellow for new VMs
    if (status === VmRunningStates.RUNNING) return "running";
    if (status === VmRunningStates.STOPPED) return "stopped";
    if (status === VmRunningStates.STARTING) return "unknown";
    if (status === VmRunningStates.DELETING) return "stopped";
    return "unknown";
  };

  const getVmStatusText = (vm: AdminVmInfo) => {
    const status = getVmStatus(vm);
    if (status === "deleted") return "DELETED";
    if (status === "new") return "NEW";
    return status.toUpperCase();
  };

  return (
    <div className={className}>
      <StatusBadge status={getVmStatusBadgeColor(vm)}>
        {getVmStatusText(vm)}
      </StatusBadge>
    </div>
  );
}

// Export the utility functions for other components that need them
export const getVmStatus = (vm: AdminVmInfo) => {
  // Check if VM is deleted first
  if (vm.deleted) {
    return "deleted";
  }

  // Check if VM is new (created == expires, indicating no payment received yet)
  if (vm.created === vm.expires) {
    return "new";
  }

  if (!vm?.running_state) {
    return "unknown";
  }
  return vm.running_state.state;
};

export const getVmStatusBadgeColor = (vm: AdminVmInfo) => {
  const status = getVmStatus(vm);
  if (status === "deleted") return "stopped"; // Use red for deleted VMs
  if (status === "new") return "warning"; // Use light yellow for new VMs
  if (status === VmRunningStates.RUNNING) return "running";
  if (status === VmRunningStates.STOPPED) return "stopped";
  if (status === VmRunningStates.STARTING) return "unknown";
  if (status === VmRunningStates.DELETING) return "stopped";
  return "unknown";
};
