import type { Toast } from "../components/Toast";

type ToastListener = (toasts: Toast[]) => void;

class ToastService {
  private toasts: Toast[] = [];
  private listeners: Set<ToastListener> = new Set();
  private idCounter = 0;

  private generateId(): string {
    return `toast-${++this.idCounter}-${Date.now()}`;
  }

  private notifyListeners(): void {
    console.log(
      "Toast service notifying listeners with",
      this.toasts.length,
      "toasts",
    );
    this.listeners.forEach((listener) => listener([...this.toasts]));
  }

  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    // Immediately call with current toasts
    listener([...this.toasts]);

    return () => {
      this.listeners.delete(listener);
    };
  }

  show(toast: Omit<Toast, "id">): string {
    const id = this.generateId();
    const newToast: Toast = {
      id,
      duration: 5000, // Default 5 seconds
      ...toast,
    };

    this.toasts.push(newToast);
    this.notifyListeners();

    return id;
  }

  dismiss(id: string): void {
    const index = this.toasts.findIndex((toast) => toast.id === id);
    if (index >= 0) {
      this.toasts.splice(index, 1);
      this.notifyListeners();
    }
  }

  dismissAll(): void {
    this.toasts = [];
    this.notifyListeners();
  }

  // Convenience methods
  success(title: string, message?: string, options?: Partial<Toast>): string {
    return this.show({
      type: "success",
      title,
      message,
      ...options,
    });
  }

  error(title: string, message?: string, options?: Partial<Toast>): string {
    return this.show({
      type: "error",
      title,
      message,
      duration: 8000, // Errors stay longer by default
      ...options,
    });
  }

  warning(title: string, message?: string, options?: Partial<Toast>): string {
    return this.show({
      type: "warning",
      title,
      message,
      duration: 6000,
      ...options,
    });
  }

  info(title: string, message?: string, options?: Partial<Toast>): string {
    return this.show({
      type: "info",
      title,
      message,
      ...options,
    });
  }

  // Job-specific methods
  jobStarted(jobId: string, jobType: string): string {
    return this.info(
      `${jobType} Started`,
      `Job ${jobId.slice(0, 8)}... is processing`,
      {
        duration: 3000,
      },
    );
  }

  jobProgress(
    jobId: string,
    jobType: string,
    percent: number,
    message?: string,
  ): string {
    return this.info(
      `${jobType} Progress`,
      `${percent}%${message ? ` - ${message}` : ""} (${jobId.slice(0, 8)}...)`,
      {
        duration: 2000,
      },
    );
  }

  jobCompleted(jobId: string, jobType: string, result?: string): string {
    return this.success(
      `${jobType} Completed`,
      result || `Job ${jobId.slice(0, 8)}... completed successfully`,
      {
        duration: 5000,
      },
    );
  }

  jobFailed(jobId: string, jobType: string, error: string): string {
    return this.error(
      `${jobType} Failed`,
      `${error} (Job: ${jobId.slice(0, 8)}...)`,
      {
        duration: 10000, // Keep error messages longer
      },
    );
  }

  jobCancelled(jobId: string, jobType: string, reason?: string): string {
    return this.warning(
      `${jobType} Cancelled`,
      reason
        ? `${reason} (${jobId.slice(0, 8)}...)`
        : `Job ${jobId.slice(0, 8)}... was cancelled`,
      {
        duration: 4000,
      },
    );
  }
}

// Global instance
export const toastService = new ToastService();
