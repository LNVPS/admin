import { useState, useEffect } from "react";
import type { Toast } from "../components/Toast";
import { toastService } from "../services/toastService";
import { jobNotificationService } from "../services/jobNotificationService";

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsubscribe = toastService.subscribe(setToasts);

    // Start job notification service when toast system is active
    jobNotificationService.start();

    return () => {
      unsubscribe();
      // Keep job notification service running as it might be needed by other components
    };
  }, []);

  return {
    toasts,
    show: toastService.show.bind(toastService),
    dismiss: toastService.dismiss.bind(toastService),
    dismissAll: toastService.dismissAll.bind(toastService),
    success: toastService.success.bind(toastService),
    error: toastService.error.bind(toastService),
    warning: toastService.warning.bind(toastService),
    info: toastService.info.bind(toastService),
  };
}
