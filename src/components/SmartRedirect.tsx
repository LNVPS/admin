import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRoles } from "../hooks/useUserRoles";

const routePermissions = [
  { path: "/users", permissions: ["users::view"] },
  { path: "/vms", permissions: ["virtual_machines::view"] },
  { path: "/hosts", permissions: ["hosts::view"] },
  { path: "/roles", permissions: ["roles::view"] },
  { path: "/analytics", permissions: ["analytics::view"] },
  { path: "/system", permissions: ["system::view"] },
  { path: "/audit", permissions: ["audit::view"] },
];

export function SmartRedirect() {
  const navigate = useNavigate();
  const { hasAnyPermission } = useUserRoles();

  useEffect(() => {
    // Find the first route the user has access to
    const accessibleRoute = routePermissions.find((route) =>
      hasAnyPermission(route.permissions),
    );

    if (accessibleRoute) {
      navigate(accessibleRoute.path, { replace: true });
    } else {
      // If user has no permissions for any route, show an error or redirect to a safe page
      console.warn("User has no permissions for any admin routes");
      // You could redirect to a "no access" page or logout
    }
  }, [hasAnyPermission, navigate]);

  return null;
}
