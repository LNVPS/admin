import { useState } from "react";
import { useJobHistory } from "../hooks/useJobHistory";
import { useToast } from "../hooks/useToast";
import { jobFeedbackService } from "../services/jobFeedbackService";
import { Button } from "./Button";
import { Modal } from "./Modal";
import {
  BugAntIcon,
  WifiIcon,
  XCircleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface JobDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JobDebugPanel({ isOpen, onClose }: JobDebugPanelProps) {
  const { jobs, getStatistics } = useJobHistory();
  const { toasts } = useToast();
  const [testMessage, setTestMessage] = useState("");

  const statistics = getStatistics();
  const isWebSocketConnected = jobFeedbackService.isConnected();

  const sendTestMessage = () => {
    // This is for testing - it simulates job feedback
    const testFeedback = {
      job_id: `test-${Date.now()}`,
      status: { Started: {} },
      timestamp: new Date().toISOString(),
    };

    console.log("Sending test feedback:", testFeedback);
    setTestMessage(
      `Sent test job feedback at ${new Date().toLocaleTimeString()}`,
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Job Feedback Debug Panel"
      size="lg"
    >
      <div className="space-y-6">
        {/* Connection Status */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-medium text-white mb-3 flex items-center">
            <WifiIcon className="h-5 w-5 mr-2" />
            WebSocket Connection
          </h3>
          <div className="flex items-center space-x-3">
            {isWebSocketConnected ? (
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
            ) : (
              <XCircleIcon className="h-5 w-5 text-red-400" />
            )}
            <span
              className={
                isWebSocketConnected ? "text-green-400" : "text-red-400"
              }
            >
              {isWebSocketConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>

        {/* Job Statistics */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-medium text-white mb-3">
            Job History Statistics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div className="text-gray-400 text-sm">Total</div>
              <div className="text-white text-xl font-bold">
                {statistics.total}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Running</div>
              <div className="text-blue-400 text-xl font-bold">
                {statistics.running}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Completed</div>
              <div className="text-green-400 text-xl font-bold">
                {statistics.completed}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Failed</div>
              <div className="text-red-400 text-xl font-bold">
                {statistics.failed}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Cancelled</div>
              <div className="text-yellow-400 text-xl font-bold">
                {statistics.cancelled}
              </div>
            </div>
          </div>
        </div>

        {/* Toast Statistics */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-medium text-white mb-3">Active Toasts</h3>
          <div className="text-white text-xl font-bold">{toasts.length}</div>
          {toasts.length > 0 && (
            <div className="mt-2 space-y-1">
              {toasts.slice(0, 3).map((toast) => (
                <div key={toast.id} className="text-sm text-gray-400">
                  [{toast.type}] {toast.title}
                </div>
              ))}
              {toasts.length > 3 && (
                <div className="text-sm text-gray-400">
                  ... and {toasts.length - 3} more
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent Jobs */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-medium text-white mb-3">Recent Jobs</h3>
          {jobs.length === 0 ? (
            <div className="text-gray-400">No jobs in history</div>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {jobs.slice(0, 5).map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="text-white">{job.job_type}</div>
                  <div className="text-gray-400">
                    {job.status_history[job.status_history.length - 1]
                      ?.message || "No status"}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {job.updated_at.toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Test Controls */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-medium text-white mb-3">Test Controls</h3>
          <div className="space-y-3">
            <Button
              variant="secondary"
              onClick={sendTestMessage}
              className="w-full"
            >
              <BugAntIcon className="h-4 w-4 mr-2" />
              Send Test Job Feedback
            </Button>
            {testMessage && (
              <div className="text-green-400 text-sm">{testMessage}</div>
            )}
          </div>
        </div>

        {/* Debug Info */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-medium text-white mb-3">
            Debug Instructions
          </h3>
          <div className="text-gray-300 text-sm space-y-2">
            <p>1. Check the browser console for debug logs</p>
            <p>2. Look for "Job feedback received:" messages</p>
            <p>3. Verify that services are notifying listeners</p>
            <p>4. Test by triggering a VM operation (start/stop/create)</p>
            <p>5. Watch for real-time updates in job history and toasts</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
