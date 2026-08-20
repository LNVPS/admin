import { BanknotesIcon, PencilIcon, PlusIcon, TicketIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { minorUnitsHuman, RulePreviewPanel } from "../components/DiscountRulePreview";
import { Modal } from "../components/Modal";
import { PaginatedTable } from "../components/PaginatedTable";
import { StatsHeader } from "../components/StatsHeader";
import { useAdminApi } from "../hooks/useAdminApi";
import { useCachedCompanies } from "../hooks/useCachedCompanies";
import { useUserRoles } from "../hooks/useUserRoles";
import type { AdminDiscountInfo } from "../lib/api";
import { confirmDialog } from "../services/confirmService";
import { toastService } from "../services/toastService";

/** `<input type="datetime-local">` value for an ISO date, in the browser's local zone. */
function toLocalDateTimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

const emptyForm = {
  code: "",
  name: "",
  rule: "",
  valid_from: "",
  valid_to: "",
  usage_limit: "",
  per_user_limit: "",
  active: true,
};

function formFromDiscount(d: AdminDiscountInfo) {
  return {
    code: d.code,
    name: d.name ?? "",
    rule: d.rule,
    valid_from: d.valid_from ? toLocalDateTimeValue(new Date(d.valid_from)) : "",
    valid_to: d.valid_to ? toLocalDateTimeValue(new Date(d.valid_to)) : "",
    usage_limit: d.usage_limit != null ? String(d.usage_limit) : "",
    per_user_limit: d.per_user_limit != null ? String(d.per_user_limit) : "",
    active: d.active,
  };
}

type DiscountForm = typeof emptyForm;

export function DiscountsPage() {
  const { data: companies, loading: companiesLoading } = useCachedCompanies();
  const adminApi = useAdminApi();
  const navigate = useNavigate();
  const { hasPermission } = useUserRoles();

  const canCreate = hasPermission("discount::create");
  const canUpdate = hasPermission("discount::update");
  const canDelete = hasPermission("discount::delete");

  const [companyId, setCompanyId] = useState<number | "">("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editing, setEditing] = useState<AdminDiscountInfo | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshData = () => setRefreshTrigger((prev) => prev + 1);

  // Default to the first company once the list arrives.
  useEffect(() => {
    if (companyId === "" && companies && companies.length > 0) {
      setCompanyId(companies[0].id);
    }
  }, [companies, companyId]);

  const company = companies?.find((c) => c.id === companyId) ?? null;

  const handleDelete = async (discount: AdminDiscountInfo) => {
    if (discount.used_count > 0) {
      toastService.error(
        "Cannot delete discount",
        `"${discount.code}" has ${discount.used_count} redemption(s). Its redemption rows are the record of what the campaign cost — deactivate it instead.`,
      );
      return;
    }
    if (
      await confirmDialog({
        title: "Delete Discount",
        message: `Are you sure you want to permanently delete discount "${discount.code}"? It has no redemptions.`,
        confirmText: "Delete",
        variant: "danger",
      })
    ) {
      try {
        await adminApi.deleteDiscount(discount.id);
        refreshData();
      } catch (error) {
        console.error("Failed to delete discount:", error);
      }
    }
  };

  const toggleActive = async (discount: AdminDiscountInfo) => {
    try {
      await adminApi.updateDiscount(discount.id, { active: !discount.active });
      refreshData();
    } catch (error) {
      console.error("Failed to update discount:", error);
    }
  };

  const renderHeader = () => (
    <>
      <th className="w-16">ID</th>
      <th>Code</th>
      <th>Rule</th>
      <th>Validity</th>
      <th>Usage</th>
      <th>Given Away</th>
      <th>Status</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (d: AdminDiscountInfo, index: number) => {
    const exhausted = d.usage_limit != null && d.used_count >= d.usage_limit;
    const now = Date.now();
    const notStarted = new Date(d.valid_from).getTime() > now;
    const expired = d.valid_to != null && new Date(d.valid_to).getTime() <= now;
    return (
      <tr key={d.id || index} className="cursor-pointer" onClick={() => navigate(`/discounts/${d.id}`)}>
        <td className="whitespace-nowrap align-top text-slate-400">{d.id}</td>
        <td className="align-top">
          <div className="min-w-0 max-w-[14rem]">
            <Link
              to={`/discounts/${d.id}`}
              onClick={(e) => e.stopPropagation()}
              className="block truncate font-mono font-semibold text-blue-400 hover:underline"
            >
              {d.code}
            </Link>
            {d.name && (
              <div className="truncate text-xs text-slate-400" title={d.name}>
                {d.name}
              </div>
            )}
          </div>
        </td>
        <td className="align-top">
          <div className="min-w-0 max-w-[22rem] truncate font-mono text-xs text-slate-300" title={d.rule}>
            {d.rule}
          </div>
        </td>
        <td className="align-top whitespace-nowrap text-slate-300">
          <div className="text-xs">
            {notStarted ? "from " : ""}
            {new Date(d.valid_from).toLocaleDateString()}
          </div>
          <div className="text-xs">{d.valid_to ? `to ${new Date(d.valid_to).toLocaleDateString()}` : "no expiry"}</div>
          {expired && <div className="text-xs font-semibold text-orange-400">expired</div>}
        </td>
        <td className="align-top whitespace-nowrap text-slate-300">
          <div className="font-mono text-xs">
            {d.used_count}
            {d.usage_limit != null ? (
              <>
                <span className="text-slate-500">/{d.usage_limit}</span>
                {exhausted && <span className="ml-1 text-orange-400">exhausted</span>}
              </>
            ) : (
              <span className="text-slate-500">/∞</span>
            )}
          </div>
          {d.per_user_limit != null && <div className="text-xs text-slate-500">{d.per_user_limit} per user</div>}
        </td>
        <td className="align-top whitespace-nowrap">
          {d.given_away.length === 0 ? (
            <span className="text-xs text-slate-500">—</span>
          ) : (
            <div className="space-y-0.5">
              {d.given_away.map((g) => (
                <div key={g.currency} className="font-mono text-xs text-amber-300">
                  {minorUnitsHuman(g.amount, g.currency)} {g.currency}
                </div>
              ))}
            </div>
          )}
        </td>
        <td className="align-top whitespace-nowrap">
          <span
            className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${
              d.active && !expired && !exhausted
                ? "border-green-500/40 bg-green-500/10 text-green-400"
                : "border-slate-600 bg-slate-700/40 text-slate-400"
            }`}
          >
            {d.active ? (expired ? "ACTIVE (expired)" : exhausted ? "ACTIVE (exhausted)" : "ACTIVE") : "INACTIVE"}
          </span>
        </td>
        <td className="text-right align-top" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-end space-x-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => toggleActive(d)}
              disabled={!canUpdate}
              className="text-xs"
            >
              {d.active ? "Deactivate" : "Activate"}
            </Button>
            {canUpdate && (
              <Button size="sm" variant="secondary" onClick={() => setEditing(d)} className="p-1">
                <PencilIcon className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleDelete(d)}
                className="text-red-400 hover:text-red-300 p-1"
                disabled={d.used_count > 0}
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  const renderEmptyState = () => (
    <div className="text-center py-8 text-slate-400">
      <TicketIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>No discounts for {company?.name ?? "this company"} yet</p>
    </div>
  );

  const calculateStats = (items: AdminDiscountInfo[], totalItems: number) => {
    const active = items.filter((d) => d.active).length;
    const totalGiven = items.reduce((sum, d) => sum + d.given_away.reduce((s, g) => s + g.amount, 0), 0);
    return (
      <StatsHeader
        title="Discounts"
        stats={[
          { label: "Total", value: totalItems },
          { label: "Active", value: active, tone: "success" },
          {
            label: "Given Away (page)",
            value: totalGiven > 0 ? `${totalGiven.toLocaleString()} minor` : "0",
            tone: "orange",
          },
        ]}
        actions={
          <>
            {/* `select` is globally `w-full` (index.css), so the width has to live on a wrapper. */}
            <div className="w-56">
              <select
                id="discount-company"
                value={companyId === "" ? "" : String(companyId)}
                onChange={(e) => setCompanyId(e.target.value === "" ? "" : Number(e.target.value))}
                className="!py-1.5 text-sm"
              >
                {companiesLoading && <option value="">Loading companies…</option>}
                {(companies ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {canCreate && (
              <Button onClick={() => setShowCreateModal(true)} disabled={companyId === ""}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Discount
              </Button>
            )}
          </>
        }
      />
    );
  };

  if (companyId === "") {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-slate-400">Select a company to view its discounts.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PaginatedTable
        apiCall={(params) => adminApi.getDiscounts({ company_id: companyId as number, ...params })}
        renderHeader={renderHeader}
        renderRow={renderRow}
        renderEmptyState={renderEmptyState}
        calculateStats={calculateStats}
        itemsPerPage={20}
        errorAction="view discounts"
        loadingMessage="Loading discounts..."
        dependencies={[companyId, refreshTrigger]}
        minWidth="1000px"
      />

      {showCreateModal && company && (
        <CreateDiscountModal
          company={company}
          onClose={() => setShowCreateModal(false)}
          onSuccess={(d) => {
            setShowCreateModal(false);
            refreshData();
            if (d) navigate(`/discounts/${d.id}`);
          }}
        />
      )}

      {editing && (
        <EditDiscountModal
          discount={editing}
          onClose={() => setEditing(null)}
          onSuccess={() => {
            setEditing(null);
            refreshData();
          }}
        />
      )}
    </div>
  );
}

function DiscountFormFields({
  form,
  setForm,
  isEdit,
}: {
  form: DiscountForm;
  setForm: (form: DiscountForm) => void;
  isEdit: boolean;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Code *</label>
          <input
            type="text"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            placeholder="SAVE10"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono"
            required
          />
          <p className="mt-1 text-xs text-slate-500">
            Unique across all companies — a customer types the code without choosing a company.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Campaign Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Black Friday 2026"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Rule (CEL) *</label>
        <textarea
          value={form.rule}
          onChange={(e) => setForm({ ...form, rule: e.target.value })}
          rows={3}
          placeholder={"order.amount >= 5000 ? {'percent': 10} : {}"}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm"
          required
        />
        <p className="mt-1 text-xs text-slate-500">
          Must return a decision map: <code>{`{'percent': 10}`}</code>,{" "}
          <code>{`{'amount': 500, 'currency': 'EUR'}`}</code> or <code>{`{}`}</code> (does not apply). Map keys must be
          quoted. Available: <code>order</code>, <code>user</code>, <code>history.orders</code>, <code>now</code>.
          Results are clamped on the server — a bad rule cannot over-discount.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Valid From</label>
          <input
            type="datetime-local"
            value={form.valid_from}
            onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          />
          <p className="mt-1 text-xs text-slate-500">Defaults to now at creation.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Valid To</label>
          <input
            type="datetime-local"
            value={form.valid_to}
            onChange={(e) => setForm({ ...form, valid_to: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          />
          <p className="mt-1 text-xs text-slate-500">Leave empty for no expiry. Must be after valid from.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Usage Limit</label>
          <input
            type="number"
            min="0"
            value={form.usage_limit}
            onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
            placeholder="unlimited"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          />
          <p className="mt-1 text-xs text-slate-500">Max redemptions. Empty = unlimited.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Per-User Limit</label>
          <input
            type="number"
            min="0"
            value={form.per_user_limit}
            onChange={(e) => setForm({ ...form, per_user_limit: e.target.value })}
            placeholder="unlimited"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          />
          <p className="mt-1 text-xs text-slate-500">Max redemptions per customer. Empty = unlimited.</p>
        </div>
      </div>

      {!isEdit && (
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          Active (customers may redeem immediately)
        </label>
      )}
    </>
  );
}

function CreateDiscountModal({
  company,
  onClose,
  onSuccess,
}: {
  company: { id: number; base_currency: string };
  onClose: () => void;
  onSuccess: (created: AdminDiscountInfo | null) => void;
}) {
  const adminApi = useAdminApi();
  const [form, setForm] = useState<DiscountForm>({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const validFrom = form.valid_from ? new Date(form.valid_from).toISOString() : undefined;
    const validTo = form.valid_to ? new Date(form.valid_to).toISOString() : null;
    if (validFrom && validTo && new Date(validTo) <= new Date(validFrom)) {
      setError("Valid to must be after valid from");
      return;
    }
    const usageLimit = form.usage_limit === "" ? null : parseInt(form.usage_limit, 10);
    const perUserLimit = form.per_user_limit === "" ? null : parseInt(form.per_user_limit, 10);
    if (usageLimit !== null && (Number.isNaN(usageLimit) || usageLimit < 0)) {
      setError("Usage limit must be a whole number >= 0");
      return;
    }
    if (perUserLimit !== null && (Number.isNaN(perUserLimit) || perUserLimit < 0)) {
      setError("Per-user limit must be a whole number >= 0");
      return;
    }
    setSubmitting(true);
    try {
      const created = await adminApi.createDiscount({
        company_id: company.id,
        code: form.code.trim(),
        name: form.name.trim() || undefined,
        rule: form.rule,
        valid_from: validFrom,
        valid_to: validTo,
        usage_limit: usageLimit,
        per_user_limit: perUserLimit,
        active: form.active,
      });
      onSuccess(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create discount");
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Create Discount — ${company.name}`} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <DiscountFormFields form={form} setForm={setForm} isEdit={false} />
        <RulePreviewPanel rule={form.rule} />
        {error && (
          <div className="bg-red-900/20 border border-red-900 rounded-lg p-3 text-red-300 text-sm">{error}</div>
        )}
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting ? "Creating..." : "Create Discount"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function EditDiscountModal({
  discount,
  onClose,
  onSuccess,
}: {
  discount: AdminDiscountInfo;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const [form, setForm] = useState<DiscountForm>(() => formFromDiscount(discount));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const validFrom = form.valid_from ? new Date(form.valid_from).toISOString() : undefined;
    const validTo = form.valid_to ? new Date(form.valid_to).toISOString() : null;
    if (validFrom && validTo && new Date(validTo) <= new Date(validFrom)) {
      setError("Valid to must be after valid from");
      return;
    }
    const usageLimit = form.usage_limit === "" ? null : parseInt(form.usage_limit, 10);
    const perUserLimit = form.per_user_limit === "" ? null : parseInt(form.per_user_limit, 10);
    if (usageLimit !== null && (Number.isNaN(usageLimit) || usageLimit < 0)) {
      setError("Usage limit must be a whole number >= 0");
      return;
    }
    if (perUserLimit !== null && (Number.isNaN(perUserLimit) || perUserLimit < 0)) {
      setError("Per-user limit must be a whole number >= 0");
      return;
    }
    setSubmitting(true);
    try {
      await adminApi.updateDiscount(discount.id, {
        code: form.code.trim(),
        name: form.name.trim() || null,
        rule: form.rule,
        valid_from: validFrom,
        valid_to: validTo,
        usage_limit: usageLimit,
        per_user_limit: perUserLimit,
        active: form.active,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update discount");
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Edit Discount — ${discount.code}`} size="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <DiscountFormFields form={form} setForm={setForm} isEdit />
        <p className="text-xs text-slate-500">
          <BanknotesIcon className="inline h-3.5 w-3.5 mr-1" />
          Redemptions so far: {discount.used_count}. The used count is owned by redemption and cannot be edited —
          lowering the usage limit below it does not unspend a campaign, and an exhausted one cannot be reopened by
          editing.
        </p>
        <RulePreviewPanel rule={form.rule} />
        {error && (
          <div className="bg-red-900/20 border border-red-900 rounded-lg p-3 text-red-300 text-sm">{error}</div>
        )}
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting ? "Saving..." : "Save Changes"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
