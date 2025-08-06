import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { Card } from "./Card";
import { Button } from "./Button";
import { isPermissionError, isAuthError } from "../lib/errorHandler";

interface ErrorStateProps {
  error: Error;
  onRetry?: () => void;
  action?: string;
}

export function ErrorState({
  error,
  onRetry,
  action = "access this resource",
}: ErrorStateProps) {
  const isPermission = isPermissionError(error);
  const isAuth = isAuthError(error);

  if (isPermission) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="max-w-md text-center">
          <div className="flex flex-col items-center space-y-4">
            <ExclamationTriangleIcon className="h-16 w-16 text-yellow-500" />
            <h2 className="text-xl font-semibold text-white">Access Denied</h2>
            <p className="text-gray-400">
              You don't have permission to {action}.
            </p>
            <p className="text-sm text-gray-500">
              Please contact your system administrator if you believe this is an
              error.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (isAuth) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="max-w-md text-center">
          <div className="flex flex-col items-center space-y-4">
            <ExclamationCircleIcon className="h-16 w-16 text-red-500" />
            <h2 className="text-xl font-semibold text-white">
              Authentication Required
            </h2>
            <p className="text-gray-400">
              Your session has expired or you need to log in again.
            </p>
            <Button
              variant="primary"
              onClick={() => (window.location.href = "/login")}
            >
              Go to Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Generic error
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <Card className="max-w-md text-center">
        <div className="flex flex-col items-center space-y-4">
          <ExclamationCircleIcon className="h-16 w-16 text-red-500" />
          <h2 className="text-xl font-semibold text-white">
            Something went wrong
          </h2>
          <p className="text-gray-400">
            {error.message || "An unexpected error occurred"}
          </p>
          {onRetry && (
            <Button variant="primary" onClick={onRetry}>
              Try Again
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
