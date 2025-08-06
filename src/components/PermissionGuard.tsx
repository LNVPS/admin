import { useUserRoles } from "../hooks/useUserRoles";
import { ErrorState } from "./ErrorState";

interface PermissionGuardProps {
  requiredPermissions: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({
  requiredPermissions,
  children,
  fallback,
}: PermissionGuardProps) {
  const { hasAnyPermission } = useUserRoles();

  if (!hasAnyPermission(requiredPermissions)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-red-400">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-white">Access Denied</h3>
          <p className="mt-1 text-sm text-gray-400">
            You don't have permission to access this page.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Required permissions: {requiredPermissions.join(", ")}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
