import {
  jobFeedbackService,
  JobFeedback,
  normalizeJobStatus,
} from "./jobFeedbackService";
import { EventEmitter } from "eventemitter3";

export interface JobHistoryEntry {
  id: string;
  job_id: string;
  worker_id?: string;
  job_type: string;
  status_history: JobStatusEntry[];
  created_at: Date;
  updated_at: Date;
  duration?: number; // milliseconds
}

export interface JobStatusEntry {
  status: JobStatus;
  timestamp: Date;
  message?: string;
}

export type JobStatus =
  | { Started: {} }
  | { Progress: { percent: number; message?: string } }
  | { Completed: { result?: string } }
  | { Failed: { error: string } }
  | { Cancelled: { reason?: string } };

export interface JobHistoryEvents {
  jobsUpdated: (jobs: JobHistoryEntry[]) => void;
  jobAdded: (job: JobHistoryEntry) => void;
  jobUpdated: (job: JobHistoryEntry) => void;
}

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

  // Final fallback: return the job_type as-is if available, otherwise "Unknown Job"
  return jobType || "Unknown Job";
}

class JobHistoryService extends EventEmitter<JobHistoryEvents> {
  private jobs = new Map<string, JobHistoryEntry>();
  private isStarted = false;
  private maxHistorySize = 1000; // Keep last 1000 jobs in memory

  constructor() {
    super();
  }

  start(): void {
    if (this.isStarted) {
      return; // Already started
    }

    // Use a bound method reference to ensure we can properly remove it later
    this.boundHandleJobFeedback = this.handleJobFeedback.bind(this);
    jobFeedbackService.on("feedback", this.boundHandleJobFeedback);
    jobFeedbackService.start();
    this.isStarted = true;

    console.log("Job history service started");
  }

  private boundHandleJobFeedback?: (feedback: JobFeedback) => void;

  stop(): void {
    if (this.isStarted && this.boundHandleJobFeedback) {
      jobFeedbackService.off("feedback", this.boundHandleJobFeedback);
      jobFeedbackService.disconnect();
      this.boundHandleJobFeedback = undefined;
      this.isStarted = false;
    }

    console.log("Job history service stopped");
  }

  private handleJobFeedback(feedback: JobFeedback): void {
    console.log("Job history service handling feedback:", feedback);
    const { job_id, job_type, worker_id, timestamp } = feedback;
    const status = normalizeJobStatus(feedback.status);
    const feedbackTime = new Date(timestamp);

    let job = this.jobs.get(job_id);
    const isNewJob = !job;

    if (!job) {
      // Create new job entry
      job = {
        id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        job_id,
        worker_id,
        job_type: getJobTypeName(job_type, job_id),
        status_history: [],
        created_at: feedbackTime,
        updated_at: feedbackTime,
      };
      this.jobs.set(job_id, job);
    }

    // Add status to history
    const statusEntry: JobStatusEntry = {
      status,
      timestamp: feedbackTime,
      message: this.getStatusMessage(status),
    };

    job.status_history.push(statusEntry);
    job.updated_at = feedbackTime;
    job.worker_id = worker_id || job.worker_id;

    // Calculate duration for completed/failed/cancelled jobs
    if ("Completed" in status || "Failed" in status || "Cancelled" in status) {
      job.duration = feedbackTime.getTime() - job.created_at.getTime();
    }

    // Cleanup old jobs if we exceed max size
    this.cleanupOldJobs();

    // Emit events
    if (isNewJob) {
      this.emit("jobAdded", job);
    } else {
      this.emit("jobUpdated", job);
    }

    this.notifyListeners();
  }

  private getStatusMessage(status: JobStatus): string {
    if ("Started" in status) {
      return "Job started";
    }

    if ("Progress" in status) {
      const { percent, message } = status.Progress;
      return `${percent}%${message ? ` - ${message}` : ""}`;
    }

    if ("Completed" in status) {
      const { result } = status.Completed;
      return result || "Job completed successfully";
    }

    if ("Failed" in status) {
      const { error } = status.Failed;
      return `Job failed: ${error}`;
    }

    if ("Cancelled" in status) {
      const { reason } = status.Cancelled;
      return reason ? `Job cancelled: ${reason}` : "Job cancelled";
    }

    return "Status update";
  }

  private cleanupOldJobs(): void {
    const jobArray = Array.from(this.jobs.values());

    if (jobArray.length > this.maxHistorySize) {
      // Sort by created_at and keep only the most recent jobs
      jobArray.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

      // Clear the map and re-add only the recent jobs
      this.jobs.clear();
      jobArray.slice(0, this.maxHistorySize).forEach((job) => {
        this.jobs.set(job.job_id, job);
      });
    }
  }

  private notifyListeners(): void {
    const jobArray = Array.from(this.jobs.values());
    // Sort by most recent first
    jobArray.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());

    console.log(
      "Job history service notifying listeners with",
      jobArray.length,
      "jobs",
    );
    this.emit("jobsUpdated", jobArray);
  }

  subscribe(listener: (jobs: JobHistoryEntry[]) => void): () => void {
    this.on("jobsUpdated", listener);

    // Immediately call with current jobs
    const jobArray = Array.from(this.jobs.values());
    jobArray.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
    listener(jobArray);

    // Auto-start when first subscriber is added
    if (this.listenerCount("jobsUpdated") === 1) {
      this.start();
    }

    return () => {
      this.off("jobsUpdated", listener);

      // Stop when no more subscribers
      if (this.listenerCount("jobsUpdated") === 0) {
        this.stop();
      }
    };
  }

  // Get all jobs
  getJobs(): JobHistoryEntry[] {
    const jobArray = Array.from(this.jobs.values());
    jobArray.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
    return jobArray;
  }

  // Get job by ID
  getJob(jobId: string): JobHistoryEntry | undefined {
    return this.jobs.get(jobId);
  }

  // Clear all history
  clearHistory(): void {
    this.jobs.clear();
    this.notifyListeners();
  }

  // Get job statistics
  getStatistics(): {
    total: number;
    completed: number;
    failed: number;
    cancelled: number;
    running: number;
  } {
    const jobs = Array.from(this.jobs.values());
    const stats = {
      total: jobs.length,
      completed: 0,
      failed: 0,
      cancelled: 0,
      running: 0,
    };

    jobs.forEach((job) => {
      const latestStatus =
        job.status_history[job.status_history.length - 1]?.status;
      if (!latestStatus) return;

      if ("Completed" in latestStatus) {
        stats.completed++;
      } else if ("Failed" in latestStatus) {
        stats.failed++;
      } else if ("Cancelled" in latestStatus) {
        stats.cancelled++;
      } else {
        stats.running++;
      }
    });

    return stats;
  }
}

// Global instance
export const jobHistoryService = new JobHistoryService();
