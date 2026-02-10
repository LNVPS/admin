import { NostrSystem } from "@snort/system";
import { SnortContext } from "@snort/system-react";
import { useEffect } from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { PermissionGuard } from "./components/PermissionGuard";
import { SmartRedirect } from "./components/SmartRedirect";
import { ProtectedLayout } from "./layouts/ProtectedLayout";
import { AccessPoliciesPage } from "./pages/AccessPoliciesPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { AuditLogPage } from "./pages/AuditLogPage";
import { BulkMessagePage } from "./pages/BulkMessagePage";
import { CompaniesPage } from "./pages/CompaniesPage";
import { CustomPricingPage } from "./pages/CustomPricingPage";
import { HostsPage } from "./pages/HostsPage";
import { IpAddressDetailsPage } from "./pages/IpAddressDetailsPage";
import { IpRangesPage } from "./pages/IpRangesPage";
import { IpSpacesPage } from "./pages/IpSpacesPage";
import { JobHistoryPage } from "./pages/JobHistoryPage";
// Import pages (we'll create these next)
import { LoginPage } from "./pages/LoginPage";
import { OsImagesPage } from "./pages/OsImagesPage";
import { ReferralsReportPage } from "./pages/ReferralsReportPage";
import { RegionsPage } from "./pages/RegionsPage";
import { RolesPage } from "./pages/RolesPage";
import { RoutersPage } from "./pages/RoutersPage";
import { SalesReportPage } from "./pages/SalesReportPage";
import { SubscriptionDetailPage } from "./pages/SubscriptionDetailPage";
import { SubscriptionsPage } from "./pages/SubscriptionsPage";
import { SystemPage } from "./pages/SystemPage";
import { UserDetailsPage } from "./pages/UserDetailsPage";
import { UsersPage } from "./pages/UsersPage";
import { VMDetailPage } from "./pages/VMDetailPage";
import { VMsPage } from "./pages/VMsPage";
import { VmIpAssignmentsPage } from "./pages/VmIpAssignmentsPage";
import { VmTemplatesPage } from "./pages/VmTemplatesPage";
import { jobHistoryService } from "./services/jobHistoryService";
import { jobNotificationService } from "./services/jobNotificationService";

const system = new NostrSystem({
  automaticOutboxModel: false,
  buildFollowGraph: false,
});

// Connect to well-known nostr relays
const relays = [
  "wss://relay.snort.social/",
  "wss://relay.damus.io/",
  "wss://relay.nostr.band/",
  "wss://nos.lol/",
  "wss://relay.primal.net/",
  "wss://nostr.wine/",
];

relays.forEach(async (url) => {
  try {
    await system.ConnectToRelay(url, { read: true, write: false });
    console.log(`✓ Connected to nostr relay: ${url}`);
  } catch (error) {
    console.warn(`✗ Failed to connect to nostr relay: ${url}`, error);
  }
});

function AppContent() {
  useEffect(() => {
    // Services will start automatically when components subscribe to them
    // No need to manually start/stop here as it can interfere with subscriber lifecycle
    return () => {
      // Optional cleanup on app unmount
      jobNotificationService.stop();
      jobHistoryService.stop();
    };
  }, []);

  return (
    <>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route path="/" element={<ProtectedLayout />}>
            <Route index element={<SmartRedirect />} />
            <Route
              path="users"
              element={
                <PermissionGuard requiredPermissions={["users::view"]}>
                  <UsersPage />
                </PermissionGuard>
              }
            />
            <Route
              path="users/:id"
              element={
                <PermissionGuard requiredPermissions={["users::view"]}>
                  <UserDetailsPage />
                </PermissionGuard>
              }
            />
            <Route
              path="vms"
              element={
                <PermissionGuard requiredPermissions={["virtual_machines::view"]}>
                  <VMsPage />
                </PermissionGuard>
              }
            />
            <Route
              path="vms/:id"
              element={
                <PermissionGuard requiredPermissions={["virtual_machines::view"]}>
                  <VMDetailPage />
                </PermissionGuard>
              }
            />
            <Route
              path="hosts"
              element={
                <PermissionGuard requiredPermissions={["hosts::view"]}>
                  <HostsPage />
                </PermissionGuard>
              }
            />
            <Route
              path="roles"
              element={
                <PermissionGuard requiredPermissions={["roles::view"]}>
                  <RolesPage />
                </PermissionGuard>
              }
            />
            <Route
              path="analytics"
              element={
                <PermissionGuard requiredPermissions={["analytics::view"]}>
                  <AnalyticsPage />
                </PermissionGuard>
              }
            />
            <Route
              path="system"
              element={
                <PermissionGuard requiredPermissions={["system::view"]}>
                  <SystemPage />
                </PermissionGuard>
              }
            />
            <Route
              path="audit"
              element={
                <PermissionGuard requiredPermissions={["audit::view"]}>
                  <AuditLogPage />
                </PermissionGuard>
              }
            />
            <Route
              path="regions"
              element={
                <PermissionGuard requiredPermissions={["host_region::view"]}>
                  <RegionsPage />
                </PermissionGuard>
              }
            />
            <Route
              path="os-images"
              element={
                <PermissionGuard requiredPermissions={["vm_os_image::view"]}>
                  <OsImagesPage />
                </PermissionGuard>
              }
            />
            <Route
              path="vm-templates"
              element={
                <PermissionGuard requiredPermissions={["vm_template::view"]}>
                  <VmTemplatesPage />
                </PermissionGuard>
              }
            />
            <Route
              path="custom-pricing"
              element={
                <PermissionGuard requiredPermissions={["vm_custom_pricing::view"]}>
                  <CustomPricingPage />
                </PermissionGuard>
              }
            />
            <Route
              path="companies"
              element={
                <PermissionGuard requiredPermissions={["company::view"]}>
                  <CompaniesPage />
                </PermissionGuard>
              }
            />
            <Route
              path="ip-ranges"
              element={
                <PermissionGuard requiredPermissions={["ip_range::view"]}>
                  <IpRangesPage />
                </PermissionGuard>
              }
            />
            <Route
              path="vm-ip-assignments"
              element={
                <PermissionGuard requiredPermissions={["ip_range::view"]}>
                  <VmIpAssignmentsPage />
                </PermissionGuard>
              }
            />
            <Route
              path="ip-address/:ip"
              element={
                <PermissionGuard requiredPermissions={["ip_range::view"]}>
                  <IpAddressDetailsPage />
                </PermissionGuard>
              }
            />
            <Route
              path="access-policies"
              element={
                <PermissionGuard requiredPermissions={["access_policy::view"]}>
                  <AccessPoliciesPage />
                </PermissionGuard>
              }
            />
            <Route
              path="routers"
              element={
                <PermissionGuard requiredPermissions={["router::view"]}>
                  <RoutersPage />
                </PermissionGuard>
              }
            />
            <Route
              path="sales-report"
              element={
                <PermissionGuard requiredPermissions={["analytics::view"]}>
                  <SalesReportPage />
                </PermissionGuard>
              }
            />
            <Route
              path="referrals-report"
              element={
                <PermissionGuard requiredPermissions={["analytics::view"]}>
                  <ReferralsReportPage />
                </PermissionGuard>
              }
            />
            <Route
              path="bulk-message"
              element={
                <PermissionGuard requiredPermissions={["users::update"]}>
                  <BulkMessagePage />
                </PermissionGuard>
              }
            />
            <Route
              path="job-history"
              element={
                <PermissionGuard requiredPermissions={["virtual_machines::view"]}>
                  <JobHistoryPage />
                </PermissionGuard>
              }
            />
            <Route
              path="ip-spaces"
              element={
                <PermissionGuard requiredPermissions={["ip_space::view"]}>
                  <IpSpacesPage />
                </PermissionGuard>
              }
            />
            <Route
              path="subscriptions"
              element={
                <PermissionGuard requiredPermissions={["subscriptions::view"]}>
                  <SubscriptionsPage />
                </PermissionGuard>
              }
            />
            <Route
              path="subscriptions/:id"
              element={
                <PermissionGuard requiredPermissions={["subscriptions::view"]}>
                  <SubscriptionDetailPage />
                </PermissionGuard>
              }
            />
          </Route>
        </Routes>
      </Router>
    </>
  );
}

export function App() {
  return (
    <SnortContext.Provider value={system}>
      <AppContent />
    </SnortContext.Provider>
  );
}
