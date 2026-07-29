import { FireIcon, PencilIcon, PlusIcon, RocketLaunchIcon, TrashIcon } from "@heroicons/react/24/outline";
import { configFieldDisplayLabel, parseComposeSchema } from "lnvps-compose";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { countActiveFilters, FilterBar, FilterButton, type FilterField } from "../components/FilterBar";
import { Modal } from "../components/Modal";
import { PaginatedTable } from "../components/PaginatedTable";
import { type StatItem, StatsHeader } from "../components/StatsHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useAdminApi } from "../hooks/useAdminApi";
import { useCachedRegions } from "../hooks/useCachedRegions";
import { useToast } from "../hooks/useToast";
import { useUserRoles } from "../hooks/useUserRoles";
import {
  type AdminAppClusterInfo,
  type AdminAppDeploymentInfo,
  type AdminAppInfo,
  APP_DEPLOYMENT_DESIRED_STATES,
  APP_DEPLOYMENT_STATUSES,
  type AppDeploymentDesiredState,
  type AppDeploymentStatus,
} from "../lib/api";
import { fetchAllPages } from "../lib/paginate";
import { confirmDialog } from "../services/confirmService";

type BadgeStatus = "running" | "stopped" | "warning" | "unknown";

/** Map a free-form deployment state to a StatusBadge tone. */
function badgeStatus(state: string): BadgeStatus {
  const s = state.toLowerCase();
  if (s === "running") return "running";
  if (s === "stopped") return "stopped";
  if (s === "pending" || s === "creating" || s === "deleting" || s === "starting" || s === "stopping") return "warning";
  if (s === "error" || s === "failed") return "warning";
  return "unknown";
}

export function AppDeploymentsPage() {
  const adminApi = useAdminApi();
  const { hasPermission, isSuperAdmin } = useUserRoles();
  const { success, error: toastError } = useToast();
  const [apps, setApps] = useState<AdminAppInfo[]>([]);
  const [clusters, setClusters] = useState<AdminAppClusterInfo[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editing, setEditing] = useState<AdminAppDeploymentInfo | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [userIdFilter, setUserIdFilter] = useState("");
  const [appFilter, setAppFilter] = useState("");
  const [clusterFilter, setClusterFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [desiredStateFilter, setDesiredStateFilter] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const { data: regions } = useCachedRegions();

  const canUpdate = hasPermission("app_deployment::update");
  const canDelete = hasPermission("app_deployment::delete");
  const refreshData = () => setRefreshTrigger((prev) => prev + 1);

  const handleDelete = async (d: AdminAppDeploymentInfo) => {
    if (
      !(await confirmDialog({
        title: "Delete Deployment",
        message: `Delete "${d.name}" (#${d.id})? Billing stops and the operator tears down the namespace and its volumes on its next reconcile. A deployment that was never paid for is removed outright; a paid one is retained for records and can be purged separately.`,
        confirmText: "Delete",
        variant: "danger",
      }))
    )
      return;
    try {
      await adminApi.deleteAppDeployment(d.id);
      success("Deployment deleted");
      refreshData();
    } catch (err) {
      console.error("Failed to delete deployment:", err);
      toastError(err instanceof Error ? err.message : "Failed to delete deployment");
    }
  };

  const handlePurge = async (d: AdminAppDeploymentInfo) => {
    if (
      !(await confirmDialog({
        title: "Permanently Purge Deployment",
        message: `PERMANENTLY delete (purge) "${d.name}" (#${d.id}), including its subscription, line items and payment history?\n\nThis cannot be undone and is intended for removing test deployments.`,
        confirmText: "Purge",
        variant: "danger",
      }))
    )
      return;
    try {
      await adminApi.deleteAppDeployment(d.id, true);
      success("Deployment purged");
      refreshData();
    } catch (err) {
      console.error("Failed to purge deployment:", err);
      toastError(err instanceof Error ? err.message : "Failed to purge deployment");
    }
  };

  // Paged to exhaustion rather than asked for in one oversized page: both
  // endpoints clamp `limit` to 100 silently, so past the 100th app or cluster a
  // single request left every later row rendering `App #147` instead of a name,
  // with nothing in the UI to say why.
  useEffect(() => {
    fetchAllPages((params) => adminApi.getApps(params))
      .then(setApps)
      .catch(console.error);
    fetchAllPages((params) => adminApi.getAppClusters(params))
      .then(setClusters)
      .catch(console.error);
  }, [adminApi]);

  const appName = (id: number) => apps.find((a) => a.id === id)?.display_name ?? `App #${id}`;
  const clusterName = (id: number) => clusters.find((c) => c.id === id)?.name ?? `Cluster #${id}`;

  const filterFields: FilterField[] = [
    {
      kind: "text",
      key: "deployment-search",
      label: "Search",
      value: searchFilter,
      placeholder: "Name, hostname or custom domain",
      onChange: setSearchFilter,
      colSpan: 2,
    },
    {
      kind: "number",
      key: "deployment-user",
      label: "User ID",
      value: userIdFilter,
      placeholder: "e.g. 42",
      onChange: setUserIdFilter,
    },
    {
      kind: "select",
      key: "deployment-app",
      label: "App",
      value: appFilter,
      onChange: setAppFilter,
      options: [{ value: "", label: "All apps" }, ...apps.map((a) => ({ value: String(a.id), label: a.display_name }))],
    },
    {
      kind: "select",
      key: "deployment-cluster",
      label: "Cluster",
      value: clusterFilter,
      onChange: setClusterFilter,
      options: [{ value: "", label: "All clusters" }, ...clusters.map((c) => ({ value: String(c.id), label: c.name }))],
    },
    {
      kind: "select",
      key: "deployment-region",
      label: "Region",
      value: regionFilter,
      onChange: setRegionFilter,
      hint: "Matches deployments on any cluster in the region.",
      options: [
        { value: "", label: "All regions" },
        ...(regions?.map((r) => ({ value: String(r.id), label: r.name })) ?? []),
      ],
    },
    {
      kind: "select",
      key: "deployment-status",
      label: "Status",
      value: statusFilter,
      onChange: setStatusFilter,
      options: [{ value: "", label: "Any status" }, ...APP_DEPLOYMENT_STATUSES.map((s) => ({ value: s, label: s }))],
    },
    {
      kind: "select",
      key: "deployment-desired-state",
      label: "Desired state",
      value: desiredStateFilter,
      onChange: setDesiredStateFilter,
      options: [
        { value: "", label: "Any desired state" },
        ...APP_DEPLOYMENT_DESIRED_STATES.map((s) => ({ value: s, label: s })),
      ],
    },
    {
      kind: "checkbox",
      key: "deployment-include-deleted",
      label: "Include deleted",
      value: includeDeleted,
      onChange: setIncludeDeleted,
      hint: "Deletion is a soft delete; this is the only way to see a torn-down deployment.",
    },
  ];

  const clearFilters = () => {
    setSearchFilter("");
    setUserIdFilter("");
    setAppFilter("");
    setClusterFilter("");
    setRegionFilter("");
    setStatusFilter("");
    setDesiredStateFilter("");
    setIncludeDeleted(false);
  };

  // Blanks are omitted rather than sent: the API rejects an empty value for the
  // enum-valued filters, and a partially-typed user ID would otherwise 400.
  const fetchDeployments = useCallback(
    (params: { limit: number; offset: number }) => {
      const userId = Number.parseInt(userIdFilter, 10);
      return adminApi.getAppDeployments({
        ...params,
        search: searchFilter.trim() || undefined,
        user_id: Number.isNaN(userId) ? undefined : userId,
        app_id: appFilter ? Number(appFilter) : undefined,
        cluster_id: clusterFilter ? Number(clusterFilter) : undefined,
        region_id: regionFilter ? Number(regionFilter) : undefined,
        status: (statusFilter as AppDeploymentStatus) || undefined,
        desired_state: (desiredStateFilter as AppDeploymentDesiredState) || undefined,
        include_deleted: includeDeleted || undefined,
      });
    },
    [
      adminApi,
      searchFilter,
      userIdFilter,
      appFilter,
      clusterFilter,
      regionFilter,
      statusFilter,
      desiredStateFilter,
      includeDeleted,
    ],
  );

  const renderHeader = () => (
    <>
      <th className="w-16">ID</th>
      <th>Name</th>
      <th>Hostname</th>
      <th>App</th>
      <th>User</th>
      <th>Cluster</th>
      <th>State</th>
      <th>Created</th>
      {(canUpdate || canDelete) && <th className="text-right">Actions</th>}
    </>
  );

  const renderRow = (d: AdminAppDeploymentInfo, index: number) => (
    // Soft-deleted rows only appear under "Include deleted"; dim them the same
    // way VMsPage does so a torn-down deployment never reads as a live one.
    <tr key={d.id || index} className={d.deleted ? "bg-gray-800/50 opacity-75" : ""}>
      <td className="whitespace-nowrap align-top text-white">{d.id}</td>
      <td className="align-top">
        <div className="truncate font-medium text-white" title={d.name}>
          {d.name}
        </div>
        <div className="font-mono text-xs text-gray-500" title={d.namespace}>
          {d.namespace}
        </div>
      </td>
      <td className="align-top">
        {d.hostname ? (
          <a
            href={`https://${d.hostname}`}
            target="_blank"
            rel="noreferrer"
            className="truncate font-mono text-xs text-blue-400 hover:underline"
            title={d.hostname}
          >
            {d.hostname}
          </a>
        ) : (
          <span className="text-gray-500">—</span>
        )}
        {d.custom_domain && (
          <a
            href={`https://${d.custom_domain}`}
            target="_blank"
            rel="noreferrer"
            className="block truncate font-mono text-xs text-emerald-400 hover:underline"
            title={`Custom domain: ${d.custom_domain}`}
          >
            {d.custom_domain}
          </a>
        )}
      </td>
      <td className="align-top text-gray-300">
        {appName(d.app_id)}{" "}
        {/* Multiplies the app's base footprint *and* price, so a ×2 row is not
            the same product as its ×1 neighbour — always show which it is. */}
        <span
          className={d.resource_multiplier > 1 ? "font-medium text-blue-400" : "text-gray-500"}
          title={`${d.resource_multiplier}× the app's base footprint and price`}
        >
          ×{d.resource_multiplier}
        </span>
      </td>
      <td className="align-top">
        <Link to={`/users/${d.user_id}`} className="text-blue-400 hover:underline">
          #{d.user_id}
        </Link>
      </td>
      <td className="align-top text-gray-300">{clusterName(d.cluster_id)}</td>
      <td className="align-top">
        <div className="flex flex-col gap-1">
          {/* `status` is whatever the operator last wrote and can still say
              "running" on a row that has since been torn down — lead with the
              soft-delete so it is never read as live. */}
          {d.deleted && <StatusBadge status="stopped">deleted</StatusBadge>}
          <StatusBadge status={badgeStatus(d.status)}>{d.status}</StatusBadge>
          {d.desired_state.toLowerCase() !== d.status.toLowerCase() && (
            <span className="text-xs text-slate-400">→ {d.desired_state}</span>
          )}
          {d.status_message && (
            <span className="text-xs text-orange-400 max-w-[16rem] truncate" title={d.status_message}>
              {d.status_message}
            </span>
          )}
        </div>
      </td>
      <td className="align-top text-xs text-gray-400 whitespace-nowrap">{new Date(d.created).toLocaleString()}</td>
      {(canUpdate || canDelete) && (
        <td className="text-right align-top">
          <div className="flex justify-end space-x-2">
            {/* Nothing to edit and nothing left to delete once the row is
                soft-deleted — a second delete is a 409 from the API. Purge stays,
                because purging an already-deleted deployment is the point. */}
            {canUpdate && !d.deleted && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setEditing(d)}
                className="p-1"
                title="Edit deployment"
              >
                <PencilIcon className="h-4 w-4" />
              </Button>
            )}
            {canDelete && !d.deleted && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleDelete(d)}
                className="text-red-400 hover:text-red-300 p-1"
                title="Delete deployment — stops billing and tears down the namespace"
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            )}
            {canDelete && isSuperAdmin && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handlePurge(d)}
                className="text-red-500 hover:text-red-400 p-1"
                title="Permanently purge deployment, including payment history — super admin only"
              >
                <FireIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        </td>
      )}
    </tr>
  );

  const renderEmptyState = () => (
    <div className="text-center py-8 text-slate-400">
      <RocketLaunchIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
      {/* An empty filtered page is not an empty cluster — say which one it is. */}
      <p>{countActiveFilters(filterFields) > 0 ? "No deployments match these filters" : "No app deployments"}</p>
    </div>
  );

  const calculateStats = (deployments: AdminAppDeploymentInfo[], totalItems: number) => {
    const stats: StatItem[] = [
      { label: "Total", value: totalItems },
      {
        label: "Running",
        value: deployments.filter((d) => d.status.toLowerCase() === "running").length,
        tone: "success",
      },
    ];
    // Only meaningful once deleted rows are in the page at all (VMsPage does the same).
    if (includeDeleted) {
      stats.push({ label: "Deleted", value: deployments.filter((d) => d.deleted).length, tone: "muted" });
    }
    return (
      <StatsHeader
        title="App Deployments"
        stats={stats}
        actions={
          <FilterButton
            open={showFilters}
            activeCount={countActiveFilters(filterFields)}
            onClick={() => setShowFilters((prev) => !prev)}
          />
        }
      />
    );
  };

  return (
    <div className="space-y-6">
      <PaginatedTable
        apiCall={fetchDeployments}
        toolbar={
          <FilterBar
            open={showFilters}
            fields={filterFields}
            onClear={clearFilters}
            onClose={() => setShowFilters(false)}
          />
        }
        renderHeader={renderHeader}
        renderRow={renderRow}
        renderEmptyState={renderEmptyState}
        calculateStats={calculateStats}
        itemsPerPage={20}
        errorAction="view app deployments"
        loadingMessage="Loading app deployments..."
        dependencies={[
          apps.length,
          clusters.length,
          refreshTrigger,
          searchFilter,
          userIdFilter,
          appFilter,
          clusterFilter,
          regionFilter,
          statusFilter,
          desiredStateFilter,
          includeDeleted,
        ]}
        minWidth="1100px"
      />

      {editing && (
        <EditDeploymentModal
          deployment={editing}
          app={apps.find((a) => a.id === editing.app_id)}
          cluster={clusters.find((c) => c.id === editing.cluster_id)}
          onClose={() => setEditing(null)}
          onSuccess={refreshData}
        />
      )}
    </div>
  );
}

type ConfigRow = { id: string; key: string; value: string };

function newConfigRow(key = "", value = ""): ConfigRow {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, key, value };
}

/**
 * Edit a deployment's name, custom domain and config.
 * Fetches the single-deployment endpoint on open because the list response
 * omits the (decrypted) `config` map.
 */
function EditDeploymentModal({
  deployment,
  app,
  cluster,
  onClose,
  onSuccess,
}: {
  deployment: AdminAppDeploymentInfo;
  app?: AdminAppInfo;
  cluster?: AdminAppClusterInfo;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const { success, error: toastError } = useToast();
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(deployment.name);
  const [customDomain, setCustomDomain] = useState(deployment.custom_domain ?? "");
  const [configRows, setConfigRows] = useState<ConfigRow[]>([]);
  // Falls back to fetching the catalog app when it isn't in the page's cached list.
  const [fetchedApp, setFetchedApp] = useState<AdminAppInfo | null>(null);

  useEffect(() => {
    if (app) return;
    let cancelled = false;
    adminApi
      .getApp(deployment.app_id)
      .then((a) => {
        if (!cancelled) setFetchedApp(a);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [adminApi, app, deployment.app_id]);

  useEffect(() => {
    let cancelled = false;
    setLoadingConfig(true);
    adminApi
      .getAppDeployment(deployment.id)
      .then((full) => {
        if (cancelled) return;
        setName(full.name);
        setCustomDomain(full.custom_domain ?? "");
        setConfigRows(Object.entries(full.config ?? {}).map(([key, value]) => newConfigRow(key, value)));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load deployment");
      })
      .finally(() => {
        if (!cancelled) setLoadingConfig(false);
      });
    return () => {
      cancelled = true;
    };
  }, [adminApi, deployment.id]);

  const updateRow = (id: string, patch: Partial<ConfigRow>) =>
    setConfigRows((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const catalogApp = app ?? fetchedApp ?? undefined;
  /** Fields the app's compose declares, so unset fields are still shown/editable. */
  const schema = useMemo(() => parseComposeSchema(catalogApp?.compose ?? ""), [catalogApp?.compose]);
  const declared = useMemo(() => new Set(schema.config.map((f) => f.name)), [schema]);
  /** Stored keys the compose no longer declares — kept editable so nothing is silently dropped. */
  const extraRows = configRows.filter((row) => !declared.has(row.key));

  const fieldValue = (fieldName: string) => configRows.find((row) => row.key === fieldName)?.value ?? "";

  const setFieldValue = (fieldName: string, value: string) =>
    setConfigRows((rows) =>
      rows.some((row) => row.key === fieldName)
        ? rows.map((row) => (row.key === fieldName ? { ...row, value } : row))
        : [...rows, newConfigRow(fieldName, value)],
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // Empty values are omitted so the compose defaults apply server-side.
      const config: Record<string, string> = {};
      for (const { key, value } of configRows) {
        const trimmed = key.trim();
        if (trimmed && value !== "") config[trimmed] = value;
      }
      await adminApi.updateAppDeployment(deployment.id, {
        name: name.trim(),
        custom_domain: customDomain.trim() || null,
        config,
      });
      success("Deployment updated");
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to update deployment:", err);
      const msg = err instanceof Error ? err.message : "Failed to update deployment";
      setError(msg);
      toastError(msg);
    } finally {
      setSaving(false);
    }
  };

  const previewHostname = cluster ? `${name || deployment.name}.${cluster.ingress_domain}` : deployment.hostname;

  return (
    <Modal isOpen onClose={onClose} title={`Edit Deployment #${deployment.id}`} size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-3 py-2 rounded text-sm">{error}</div>
        )}

        <div>
          <label htmlFor="deployment-name" className="block text-xs font-medium text-white mb-2">
            Name *
          </label>
          <input
            id="deployment-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="font-mono"
            pattern="[a-z0-9\-]+"
            title="Lowercase letters, digits and hyphens only"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            DNS-safe, unique per cluster. Hostname becomes{" "}
            <span className="font-mono text-gray-400">{previewHostname ?? "—"}</span>.
          </p>
        </div>

        <div>
          <label htmlFor="deployment-custom-domain" className="block text-xs font-medium text-white mb-2">
            Custom Domain
          </label>
          <input
            id="deployment-custom-domain"
            type="text"
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value)}
            className="font-mono"
            placeholder="blog.example.com"
          />
          <p className="text-xs text-gray-500 mt-1">
            Customer-owned hostname CNAME'd at the deployment hostname; TLS is issued once DNS resolves. Leave blank to
            clear.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="block text-xs font-medium text-white">
              Config
              {catalogApp ? <span className="text-gray-500 font-normal"> — {catalogApp.display_name}</span> : null}
            </span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setConfigRows((rows) => [...rows, newConfigRow()])}
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add field
            </Button>
          </div>

          {loadingConfig ? (
            <p className="text-xs text-gray-500">Loading config...</p>
          ) : (
            <div className="space-y-3">
              {schema.config.map((field) => {
                const inputId = `config-${field.name}`;
                const value = fieldValue(field.name);
                return (
                  <div key={field.name}>
                    <label htmlFor={inputId} className="block text-xs text-gray-300 mb-1">
                      {configFieldDisplayLabel(field)}
                      {field.required && <span className="text-red-400"> *</span>}
                      <span className="ml-2 font-mono text-[0.65rem] text-gray-500">
                        {field.name} ({field.type})
                      </span>
                    </label>
                    {field.type === "bool" ? (
                      <select id={inputId} value={value} onChange={(e) => setFieldValue(field.name, e.target.value)}>
                        <option value="">{field.default ? `default (${field.default})` : "unset"}</option>
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : field.type === "file" ? (
                      <textarea
                        id={inputId}
                        value={value}
                        onChange={(e) => setFieldValue(field.name, e.target.value)}
                        className="font-mono text-xs w-full min-h-[8rem]"
                        placeholder={field.default ?? ""}
                        spellCheck={false}
                      />
                    ) : (
                      <input
                        id={inputId}
                        type={field.type === "int" ? "number" : "text"}
                        value={value}
                        onChange={(e) => setFieldValue(field.name, e.target.value)}
                        className="font-mono text-xs"
                        placeholder={field.default ?? ""}
                      />
                    )}
                  </div>
                );
              })}

              {schema.config.length === 0 && extraRows.length === 0 && (
                <p className="text-xs text-gray-500">
                  {catalogApp
                    ? "This app's compose declares no customer config fields."
                    : "App not loaded — showing stored values only."}
                </p>
              )}

              {extraRows.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-700">
                  <p className="text-xs text-gray-500">Stored values not declared by the compose:</p>
                  {extraRows.map((row) => (
                    <div key={row.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={row.key}
                        onChange={(e) => updateRow(row.id, { key: e.target.value })}
                        className="font-mono text-xs w-1/3"
                        placeholder="field"
                        aria-label="Config field name"
                      />
                      <input
                        type="text"
                        value={row.value}
                        onChange={(e) => updateRow(row.id, { value: e.target.value })}
                        className="font-mono text-xs flex-1"
                        placeholder="value"
                        aria-label="Config field value"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => setConfigRows((rows) => rows.filter((r) => r.id !== row.id))}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Remove field"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {schema.secrets.length > 0 && (
                <p className="text-xs text-gray-500">
                  Generated secrets (never exposed):{" "}
                  <span className="font-mono text-gray-400">{schema.secrets.map((s) => s.name).join(", ")}</span>
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-gray-500 mt-2">
            Decrypted customer config — may contain secrets. Validated against the app's compose schema and replaces the
            stored config wholesale; the operator reconciles on its next loop.
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || loadingConfig}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
