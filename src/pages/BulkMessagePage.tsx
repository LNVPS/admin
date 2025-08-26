import { useState } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import { Button } from "../components/Button";
import { handleApiError } from "../lib/errorHandler";
import { 
  PaperAirplaneIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon 
} from "@heroicons/react/24/outline";

export function BulkMessagePage() {
  const adminApi = useAdminApi();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim() || !message.trim()) {
      setError("Both subject and message are required");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await adminApi.sendBulkMessage({
        subject: subject.trim(),
        message: message.trim(),
      });

      if (result.job_dispatched) {
        setSuccessMessage(
          `Bulk message job dispatched successfully! Job ID: ${result.job_id}. You will receive a completion notification with delivery statistics when the job finishes.`
        );
        setSubject("");
        setMessage("");
      } else {
        setError("Failed to dispatch bulk message job");
      }
    } catch (err) {
      setError(handleApiError(err, "send bulk message"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setSubject("");
    setMessage("");
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Bulk Message</h1>
        <p className="mt-2 text-gray-400">
          Send messages to all active customers based on their contact preferences.
        </p>
      </div>

      {/* Information Panel */}
      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
        <div className="flex items-start">
          <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
          <div className="space-y-2 text-sm">
            <p className="text-blue-300 font-medium">Active customers are defined as users who:</p>
            <ul className="text-gray-300 list-disc list-inside space-y-1 ml-2">
              <li>Have at least one non-deleted VM</li>
              <li>Have at least one contact method enabled (email or NIP-17)</li>
              <li>Have the necessary contact information</li>
            </ul>
            <p className="text-blue-300 font-medium mt-3">Message delivery priority:</p>
            <ol className="text-gray-300 list-decimal list-inside space-y-1 ml-2">
              <li>Email (if contact_email = true and email address exists)</li>
              <li>NIP-17 DM (if contact_nip17 = true and email failed/unavailable)</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
          <div className="flex items-start">
            <CheckCircleIcon className="h-5 w-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-green-300 text-sm">
              {successMessage}
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-red-300 text-sm">
              {error}
            </div>
          </div>
        </div>
      )}

      {/* Message Form */}
      <div className="bg-slate-800 rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">
              Subject *
            </label>
            <input
              type="text"
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter message subject..."
              maxLength={200}
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              {subject.length}/200 characters
            </p>
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
              Message *
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
              placeholder="Enter your message content..."
              maxLength={5000}
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              {message.length}/5000 characters
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-700">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClear}
              disabled={isLoading || (!subject && !message)}
            >
              Clear
            </Button>
            
            <Button
              type="submit"
              disabled={isLoading || !subject.trim() || !message.trim()}
              className="flex items-center"
            >
              <PaperAirplaneIcon className="h-4 w-4 mr-2" />
              {isLoading ? "Sending..." : "Send Bulk Message"}
            </Button>
          </div>
        </form>
      </div>

      {/* Warning Panel */}
      <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
        <div className="flex items-start">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-yellow-300 font-medium">Important Notes:</p>
            <ul className="text-gray-300 list-disc list-inside space-y-1 ml-2 mt-2">
              <li>This action will send messages to all qualifying active customers</li>
              <li>The job is processed asynchronously - you'll receive a completion notification</li>
              <li>Messages cannot be recalled once the job is dispatched</li>
              <li>Please review your message carefully before sending</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}