import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { Card } from "./Card";

interface PermissionDeniedProps {
  message?: string;
  action?: string;
}

export function PermissionDenied({
  message = "You don't have permission to access this resource.",
  action = "view this page",
}: PermissionDeniedProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <Card className="max-w-md text-center">
        <div className="flex flex-col items-center space-y-4">
          <ExclamationTriangleIcon className="h-16 w-16 text-yellow-500" />
          <h2 className="text-xl font-semibold text-white">Access Denied</h2>
          <p className="text-gray-400">{message}</p>
          <p className="text-sm text-gray-500">
            You need administrator privileges to {action}. Please contact your
            system administrator if you believe this is an error.
          </p>
        </div>
      </Card>
    </div>
  );
}
