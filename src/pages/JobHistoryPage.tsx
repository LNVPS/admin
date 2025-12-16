import { useState } from "react";
import { useJobHistory } from "../hooks/useJobHistory";
import type { JobHistoryEntry } from "../services/jobHistoryService";
import { Button } from "../components/Button";
import { StatusBadge } from "../components/StatusBadge";
import { Modal } from "../components/Modal";
import { JobDebugPanel } from "../components/JobDebugPanel";
import {
  ClockIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  PlayIcon,
  ChartBarIcon,
  BugAntIcon,
} from "@heroicons/react/24/outline";

export function JobHistoryPage() {
  const { jobs, clearHistory, getStatistics } = useJobHistory();
  const [selectedJob, setSelectedJob] = useState<JobHistoryEntry | null>(null);
  const [filter, setFilter] = useState<
    "all" | "completed" | "failed" | "cancelled" | "running"
  >("all");
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  const statistics = getStatistics();

  const getLatestStatus = (job: JobHistoryEntry) => {
    const latestEntry = job.status_history[job.status_history.length - 1];
    return latestEntry?.status;
  };

  const getJobStatusColor = (
    status: any,
  ): "running" | "stopped" | "unknown" => {
    if ("Completed" in status) return "running";
    if ("Failed" in status) return "stopped";
    if ("Cancelled" in status) return "unknown";
    return "running"; // Started/Progress
  };

  const getJobStatusText = (status: any): string => {
    if ("Started" in status) return "Running";
    if ("Progress" in status) return `Progress (${status.Progress.percent}%)`;
    if ("Completed" in status) return "Completed";
    if ("Failed" in status) return "Failed";
    if ("Cancelled" in status) return "Cancelled";
    return "Unknown";
  };

  const getJobStatusIcon = (status: any) => {
    if ("Completed" in status) return CheckCircleIcon;
    if ("Failed" in status) return XCircleIcon;
    if ("Cancelled" in status) return ExclamationCircleIcon;
    if ("Progress" in status) return ChartBarIcon;
    return PlayIcon;
  };

  const formatDuration = (duration?: number): string => {
    if (!duration) return "-";

    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const filteredJobs = jobs.filter((job) => {
    if (filter === "all") return true;

    const latestStatus = getLatestStatus(job);
    if (!latestStatus) return false;

    switch (filter) {
      case "completed":
        return "Completed" in latestStatus;
      case "failed":
        return "Failed" in latestStatus;
      case "cancelled":
        return "Cancelled" in latestStatus;
      case "running":
        return "Started" in latestStatus || "Progress" in latestStatus;
      default:
        return true;
    }
  });

  const handleClearHistory = () => {
    if (
      confirm(
        "Are you sure you want to clear all job history? This cannot be undone.",
      )
    ) {
      clearHistory();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Job History</h1>
          <p className="text-gray-400 mt-1">
            Real-time job execution history and status monitoring
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="secondary"
            onClick={() => setShowDebugPanel(true)}
            className="text-blue-400 hover:text-blue-300"
          >
            <BugAntIcon className="h-4 w-4 mr-2" />
            Debug
          </Button>
          <Button
            variant="secondary"
            onClick={handleClearHistory}
            className="text-red-400 hover:text-red-300"
            disabled={jobs.length === 0}
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Clear History
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Total Jobs</div>
          <div className="text-white text-2xl font-bold">
            {statistics.total}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Running</div>
          <div className="text-blue-400 text-2xl font-bold">
            {statistics.running}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Completed</div>
          <div className="text-green-400 text-2xl font-bold">
            {statistics.completed}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Failed</div>
          <div className="text-red-400 text-2xl font-bold">
            {statistics.failed}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Cancelled</div>
          <div className="text-yellow-400 text-2xl font-bold">
            {statistics.cancelled}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex space-x-2">
        {[
          { key: "all", label: "All" },
          { key: "running", label: "Running" },
          { key: "completed", label: "Completed" },
          { key: "failed", label: "Failed" },
          { key: "cancelled", label: "Cancelled" },
        ].map((filterOption) => (
          <button
            key={filterOption.key}
            onClick={() => setFilter(filterOption.key as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === filterOption.key
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {filterOption.label}
          </button>
        ))}
      </div>

      {/* Job List */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        {filteredJobs.length === 0 ? (
          <div className="text-center py-12">
            <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">
              {jobs.length === 0
                ? "No jobs have been executed yet"
                : `No ${filter} jobs found`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredJobs.map((job) => {
              const latestStatus = getLatestStatus(job);
              const StatusIcon = latestStatus
                ? getJobStatusIcon(latestStatus)
                : InformationCircleIcon;

              return (
                <div
                  key={job.id}
                  className="p-4 hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <StatusIcon className="h-5 w-5 mt-1 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-white font-medium">
                            {job.job_type}
                          </h3>
                          {latestStatus && (
                            <StatusBadge
                              status={getJobStatusColor(latestStatus)}
                            >
                              {getJobStatusText(latestStatus)}
                            </StatusBadge>
                          )}
                        </div>
                        <div className="text-gray-400 text-sm mt-1">
                          Job ID:{" "}
                          <span className="font-mono">
                            {job.job_id.slice(0, 16)}...
                          </span>
                          {job.worker_id && (
                            <>
                              {" • "}Worker:{" "}
                              <span className="font-mono">
                                {job.worker_id.slice(0, 8)}...
                              </span>
                            </>
                          )}
                        </div>
                        <div className="text-gray-400 text-xs mt-1">
                          Started: {job.created_at.toLocaleString()}
                          {job.duration && (
                            <>
                              {" • "}Duration: {formatDuration(job.duration)}
                            </>
                          )}
                        </div>
                        {job.status_history.length > 1 && (
                          <div className="text-gray-500 text-xs mt-1">
                            {job.status_history.length} status updates
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="secondary"
                      onClick={() => setSelectedJob(job)}
                      className="text-blue-400 hover:text-blue-300 p-2"
                      title="View details"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Job Detail Modal */}
      {selectedJob && (
        <Modal
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
          title={`${selectedJob.job_type} - Details`}
          size="lg"
        >
          <div className="space-y-4">
            {/* Job Info */}
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-400">Job ID</div>
                  <div className="text-white font-mono text-xs break-all">
                    {selectedJob.job_id}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Job Type</div>
                  <div className="text-white">{selectedJob.job_type}</div>
                </div>
                <div>
                  <div className="text-gray-400">Worker ID</div>
                  <div className="text-white font-mono text-xs">
                    {selectedJob.worker_id || "Unknown"}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Duration</div>
                  <div className="text-white">
                    {formatDuration(selectedJob.duration)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Created</div>
                  <div className="text-white">
                    {selectedJob.created_at.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Last Updated</div>
                  <div className="text-white">
                    {selectedJob.updated_at.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Status History */}
            <div>
              <h4 className="text-lg font-medium text-white mb-3">
                Status History
              </h4>
              <div className="space-y-2">
                {selectedJob.status_history.map((entry, index) => {
                  const StatusIcon = getJobStatusIcon(entry.status);
                  return (
                    <div
                      key={index}
                      className="flex items-start space-x-3 p-3 bg-gray-700 rounded-lg"
                    >
                      <StatusIcon className="h-4 w-4 mt-0.5 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <StatusBadge status={getJobStatusColor(entry.status)}>
                            {getJobStatusText(entry.status)}
                          </StatusBadge>
                          <span className="text-gray-400 text-xs">
                            {entry.timestamp.toLocaleString()}
                          </span>
                        </div>
                        {entry.message && (
                          <div className="text-gray-300 text-sm mt-1">
                            {entry.message}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Debug Panel */}
      <JobDebugPanel
        isOpen={showDebugPanel}
        onClose={() => setShowDebugPanel(false)}
      />
    </div>
  );
}
