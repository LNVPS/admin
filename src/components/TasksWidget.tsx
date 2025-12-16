import { useState, useEffect } from "react";
import { jobHistoryService, type JobHistoryEntry } from "../services/jobHistoryService";
import {
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

export function TasksWidget() {
  const [jobs, setJobs] = useState<JobHistoryEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Subscribe to job history updates
    const unsubscribe = jobHistoryService.subscribe(setJobs);

    // Start the service if needed
    jobHistoryService.start();

    return () => {
      unsubscribe();
    };
  }, []);

  // Calculate statistics
  const stats = {
    total: jobs.length,
    completed: 0,
    failed: 0,
    cancelled: 0,
    running: 0,
    waiting: 0,
  };

  jobs.forEach((job) => {
    if (job.status_history.length === 0) {
      stats.waiting++;
      return;
    }

    const latestStatus = job.status_history[job.status_history.length - 1]?.status;
    if (!latestStatus) return;

    if ("Completed" in latestStatus) {
      stats.completed++;
    } else if ("Failed" in latestStatus) {
      stats.failed++;
    } else if ("Cancelled" in latestStatus) {
      stats.cancelled++;
    } else if ("Started" in latestStatus || "Progress" in latestStatus) {
      stats.running++;
    } else {
      stats.waiting++;
    }
  });

  // Get running jobs for detailed view
  const runningJobs = jobs.filter((job) => {
    if (job.status_history.length === 0) return false;
    const latestStatus = job.status_history[job.status_history.length - 1]?.status;
    return !!(latestStatus && ("Started" in latestStatus || "Progress" in latestStatus));
  });

  // Get waiting jobs for detailed view
  const waitingJobs = jobs.filter((job) => {
    // No status yet = waiting
    if (job.status_history.length === 0) return true;

    const latestStatus = job.status_history[job.status_history.length - 1]?.status;

    // Has a status that isn't Started/Progress/Completed/Failed/Cancelled
    return !!latestStatus && !(
      "Started" in latestStatus
      || "Progress" in latestStatus
      || "Completed" in latestStatus
      || "Failed" in latestStatus
      || "Cancelled" in latestStatus
    );
  });

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer bg-slate-800"
      >
        <div className="flex items-center">
          <ClockIcon className="mr-3 h-5 w-5 text-blue-400" />
          <span>Tasks</span>
          {stats.running > 0 && (
            <span className="ml-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
              {stats.running} running
            </span>
          )}
          {stats.waiting > 0 && (
            <span className="ml-2 bg-yellow-600 text-white text-xs px-2 py-1 rounded-full">
              {stats.waiting} queued
            </span>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="mt-2 bg-slate-800 rounded-lg p-4">
          <div className="mb-3">
            <div className="flex justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase">Summary</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex flex-col items-center bg-slate-700 rounded p-2">
                <div className="flex items-center">
                  <PlayIcon className="h-3 w-3 text-green-400 mr-1" />
                  <span className="text-slate-300 font-medium">{stats.running}</span>
                </div>
                <span className="text-slate-400 text-[10px]">Running</span>
              </div>
              <div className="flex flex-col items-center bg-slate-700 rounded p-2">
                <div className="flex items-center">
                  <ClockIcon className="h-3 w-3 text-yellow-400 mr-1" />
                  <span className="text-slate-300 font-medium">{stats.waiting}</span>
                </div>
                <span className="text-slate-400 text-[10px]">Queued</span>
              </div>
              <div className="flex flex-col items-center bg-slate-700 rounded p-2">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-3 w-3 text-green-400 mr-1" />
                  <span className="text-slate-300 font-medium">{stats.completed}</span>
                </div>
                <span className="text-slate-400 text-[10px]">Completed</span>
              </div>
              <div className="flex flex-col items-center bg-slate-700 rounded p-2">
                <div className="flex items-center">
                  <XCircleIcon className="h-3 w-3 text-red-400 mr-1" />
                  <span className="text-slate-300 font-medium">{stats.failed}</span>
                </div>
                <span className="text-slate-400 text-[10px]">Failed</span>
              </div>
              <div className="flex flex-col items-center bg-slate-700 rounded p-2">
                <div className="flex items-center">
                  <PauseIcon className="h-3 w-3 text-yellow-400 mr-1" />
                  <span className="text-slate-300 font-medium">{stats.cancelled}</span>
                </div>
                <span className="text-slate-400 text-[10px]">Cancelled</span>
              </div>
              <div className="flex flex-col items-center bg-slate-700 rounded p-2">
                <span className="text-slate-300 font-medium">{stats.total}</span>
                <span className="text-slate-400 text-[10px]">Total</span>
              </div>
            </div>
          </div>

          {runningJobs.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase">Running Tasks</span>
              </div>
              <div className="space-y-2">
                {runningJobs.slice(0, 5).map((job) => {
                  const latestStatus = job.status_history[job.status_history.length - 1]?.status;
                  let progress = 0;
                  let progressMessage = "";

                  if (latestStatus && "Progress" in latestStatus) {
                    progress = latestStatus.Progress.percent;
                    progressMessage = latestStatus.Progress.message || "";
                  }

                  return (
                    <div key={job.job_id} className="flex items-center bg-slate-700 rounded p-2">
                      <div className="flex-1">
                        <div className="flex items-baseline">
                          <span className="text-xs font-medium text-slate-300">
                            {job.job_type}
                          </span>
                          {progress > 0 && (
                            <span className="text-xs text-slate-400 ml-2">
                              ({progress}%)
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500">
                          {job.job_id.slice(0, 12)}{job.job_id.length > 12 && "..."}
                        </span>
                      </div>
                      <div className="ml-2 flex items-center">
                        <span className="h-2 w-2 rounded-full bg-green-400 mr-1"></span>
                        <PlayIcon className="h-3 w-3 text-green-400" />
                      </div>
                    </div>
                  );
                })}
                {runningJobs.length > 5 && (
                  <span className="text-xs text-slate-500">
                    +{runningJobs.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}

          {waitingJobs.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase">Queued Tasks</span>
              </div>
              <div className="space-y-2">
                {waitingJobs.slice(0, 5).map((job) => {
                  return (
                    <div key={job.job_id} className="flex items-center bg-slate-700 rounded p-2">
                      <div className="flex-1">
                        <div className="flex items-baseline">
                          <span className="text-xs font-medium text-slate-300">
                            {job.job_type}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {job.job_id.slice(0, 12)}{job.job_id.length > 12 && "..."}
                        </span>
                      </div>
                      <div className="ml-2 flex items-center">
                        <span className="h-2 w-2 rounded-full bg-yellow-400 mr-1"></span>
                        <ClockIcon className="h-3 w-3 text-yellow-400" />
                      </div>
                    </div>
                  );
                })}
                {waitingJobs.length > 5 && (
                  <span className="text-xs text-slate-500">
                    +{waitingJobs.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}

          <button
            onClick={() => window.location.href = "/job-history"}
            className="w-full text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-pointer py-1"
          >
            View All Job History →
          </button>
        </div>
      )}
    </div>
  );
}
