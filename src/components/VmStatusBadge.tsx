import { type AdminVmInfo, VmRunningStates } from "../lib/api";
import { StatusBadge } from "./StatusBadge";

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

    // Check if VM is new (subscription.is_setup === false)
    if (!vm.subscription || !vm.subscription.is_setup) {
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
    if (status === VmRunningStates.CREATING) return "unknown";
    return "unknown";
  };

  const getVmStatusText = (vm: AdminVmInfo) => {
    const status = getVmStatus(vm);
    if (status === "deleted") return "DELETED";
    if (status === "new") return "NEW";
    if (status === VmRunningStates.UNKNOWN) return "UNKNOWN";
    if (status === VmRunningStates.CREATING) return "CREATING";
    if (status === VmRunningStates.RUNNING) return "RUNNING";
    if (status === VmRunningStates.STOPPED) return "STOPPED";
    return status.toUpperCase();
  };

  return (
    <div className={className}>
      <StatusBadge status={getVmStatusBadgeColor(vm)}>{getVmStatusText(vm)}</StatusBadge>
    </div>
  );
}

// Export the utility functions for other components that need them
export const getVmStatus = (vm: AdminVmInfo) => {
  // Check if VM is deleted first
  if (vm.deleted) {
    return "deleted";
  }

  // Check if VM is new (subscription.is_setup === false)
  if (!vm.subscription || !vm.subscription.is_setup) {
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
  if (status === VmRunningStates.CREATING) return "unknown";
  return "unknown";
};
