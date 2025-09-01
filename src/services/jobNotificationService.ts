import {
  jobFeedbackService,
  JobFeedback,
  normalizeJobStatus,
} from "./jobFeedbackService";
import { toastService } from "./toastService";

// Map job types from job IDs to human-readable names
const JOB_TYPE_NAMES: Record<string, string> = {
  CreateVm: "Create VM",
  StartVm: "Start VM",
  StopVm: "Stop VM",
  DeleteVm: "Delete VM",
  ProcessVmRefund: "VM Refund",
  AssignVmIp: "IP Assignment",
  UnassignVmIp: "IP Unassignment",
  UpdateVmIp: "IP Update",
  ConfigureVm: "VM Configuration",
  BulkMessage: "Bulk Message",
  CheckVms: "VM Health Check",
};

function getJobTypeName(jobType?: string, jobId?: string): string {
  // First try to use the provided job_type directly
  if (jobType && JOB_TYPE_NAMES[jobType]) {
    return JOB_TYPE_NAMES[jobType];
  }

  // Fallback: try to extract job type from job ID patterns
  if (jobId) {
    for (const [type, name] of Object.entries(JOB_TYPE_NAMES)) {
      if (jobId.toLowerCase().includes(type.toLowerCase())) {
        return name;
      }
    }
  }

  // Final fallback: return the job_type as-is if available, otherwise "Job"
  return jobType || "Job";
}

class JobNotificationService {
  private isStarted = false;
  private activeJobs = new Map<string, string>(); // job_id -> toast_id for progress tracking

  start(): void {
    if (this.isStarted) {
      return; // Already started
    }

    // Use a bound method reference to ensure we can properly remove it later
    this.boundHandleJobFeedback = this.handleJobFeedback.bind(this);
    jobFeedbackService.on("feedback", this.boundHandleJobFeedback);

    // Only start the feedback service if it's not already running
    // The history service might have already started it
    jobFeedbackService.start();

    this.isStarted = true;

    console.log("Job notification service started");
  }

  private boundHandleJobFeedback?: (feedback: JobFeedback) => void;

  stop(): void {
    if (this.isStarted && this.boundHandleJobFeedback) {
      jobFeedbackService.off("feedback", this.boundHandleJobFeedback);
      this.boundHandleJobFeedback = undefined;
      this.isStarted = false;
    }

    this.activeJobs.clear();
    console.log("Job notification service stopped");
  }

  private handleJobFeedback(feedback: JobFeedback): void {
    console.log("Job notification service handling feedback:", feedback);
    const { job_id, job_type } = feedback;
    const status = normalizeJobStatus(feedback.status);
    const jobType = getJobTypeName(job_type, job_id);

    // Handle different status types
    if ("Started" in status) {
      const toastId = toastService.info(
        `${jobType} Started`,
        `Processing job ${job_id.slice(0, 8)}...`,
        {
          duration: 3000,
        },
      );
      this.activeJobs.set(job_id, toastId);
    } else if ("Progress" in status) {
      const { percent, message } = status.Progress;

      // Dismiss previous progress toast if exists
      const existingToastId = this.activeJobs.get(job_id);
      if (existingToastId) {
        toastService.dismiss(existingToastId);
      }

      const toastId = toastService.info(
        `${jobType} Progress`,
        `${percent}%${message ? ` - ${message}` : ""} (${job_id.slice(0, 8)}...)`,
        {
          duration: 2000,
        },
      );
      this.activeJobs.set(job_id, toastId);
    } else if ("Completed" in status) {
      const { result } = status.Completed;

      // Dismiss any existing progress toast
      const existingToastId = this.activeJobs.get(job_id);
      if (existingToastId) {
        toastService.dismiss(existingToastId);
      }

      toastService.success(
        `${jobType} Completed`,
        result || `Job ${job_id.slice(0, 8)}... completed successfully`,
        {
          duration: 5000,
        },
      );

      this.activeJobs.delete(job_id);
    } else if ("Failed" in status) {
      const { error } = status.Failed;

      // Dismiss any existing progress toast
      const existingToastId = this.activeJobs.get(job_id);
      if (existingToastId) {
        toastService.dismiss(existingToastId);
      }

      toastService.error(
        `${jobType} Failed`,
        `${error} (Job: ${job_id.slice(0, 8)}...)`,
        {
          duration: 10000, // Keep error messages longer
        },
      );

      this.activeJobs.delete(job_id);
    } else if ("Cancelled" in status) {
      const { reason } = status.Cancelled;

      // Dismiss any existing progress toast
      const existingToastId = this.activeJobs.get(job_id);
      if (existingToastId) {
        toastService.dismiss(existingToastId);
      }

      toastService.warning(
        `${jobType} Cancelled`,
        reason
          ? `${reason} (${job_id.slice(0, 8)}...)`
          : `Job ${job_id.slice(0, 8)}... was cancelled`,
        {
          duration: 4000,
        },
      );

      this.activeJobs.delete(job_id);
    }
  }

  // Get connection status
  isConnected(): boolean {
    return jobFeedbackService.isConnected();
  }
}

// Global instance
export const jobNotificationService = new JobNotificationService();
