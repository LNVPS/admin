import { CreditCardIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import { useToast } from "../hooks/useToast";
import { useUserRoles } from "../hooks/useUserRoles";
import type { AdminUserPaymentMethodInfo } from "../lib/api";
import { confirmDialog } from "../services/confirmService";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { PaginatedTable } from "./PaginatedTable";

function methodLabel(method: AdminUserPaymentMethodInfo): string {
  if (method.name) return method.name;
  if (method.provider === "revolut" && method.card_last_four) {
    return `${method.card_brand ?? "Card"} •••• ${method.card_last_four}`;
  }
  return method.provider === "nwc" ? "Nostr Wallet Connect" : method.provider;
}

export function UserPaymentMethodsSection({ userId }: { userId: number }) {
  const adminApi = useAdminApi();
  const { success, error: showError } = useToast();
  const { hasPermission } = useUserRoles();
  const [editingMethod, setEditingMethod] = useState<AdminUserPaymentMethodInfo | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const canUpdate = hasPermission("user_payment_method::update");
  const canDelete = hasPermission("user_payment_method::delete");

  const refreshData = () => setRefreshTrigger((prev) => prev + 1);

  const handleDelete = async (method: AdminUserPaymentMethodInfo) => {
    if (
      !(await confirmDialog({
        title: "Delete Payment Method",
        message: `Delete saved payment method "${methodLabel(method)}"? The user will lose auto-renewal via this method.`,
      }))
    ) {
      return;
    }
    try {
      await adminApi.deleteUserPaymentMethod(method.id);
      success("Payment method deleted");
      refreshData();
    } catch (error) {
      console.error("Failed to delete payment method:", error);
      showError("Failed to delete payment method", error instanceof Error ? error.message : undefined);
    }
  };

  const renderHeader = () => (
    <>
      <th className="w-14">ID</th>
      <th>Method</th>
      <th>Card</th>
      <th>Status</th>
      <th>Created</th>
      {(canUpdate || canDelete) && <th className="text-right">Actions</th>}
    </>
  );

  const renderRow = (method: AdminUserPaymentMethodInfo, index: number) => (
    <tr key={method.id || index}>
      <td className="whitespace-nowrap align-top text-white">{method.id}</td>
      <td className="align-top">
        <div className="font-medium text-white">{methodLabel(method)}</div>
        <div className="mt-0.5 text-xs text-slate-400">
          {method.provider.toUpperCase()}
          {method.has_external_customer_id ? " · provider customer on file" : ""}
        </div>
      </td>
      <td className="align-top text-gray-300 text-sm">
        {method.card_last_four ? (
          <>
            <div>
              {method.card_brand ?? "Card"} •••• {method.card_last_four}
            </div>
            {method.exp_month && method.exp_year && (
              <div className="text-xs text-slate-400">
                Expires {String(method.exp_month).padStart(2, "0")}/{method.exp_year}
              </div>
            )}
          </>
        ) : (
          <span className="text-slate-500">—</span>
        )}
      </td>
      <td className="align-top">
        <div className="flex flex-wrap gap-1">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
              method.enabled ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
            }`}
          >
            {method.enabled ? "Enabled" : "Disabled"}
          </span>
          {method.is_default && (
            <span className="inline-flex rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
              Default
            </span>
          )}
        </div>
      </td>
      <td className="align-top text-gray-300 text-sm">{new Date(method.created).toLocaleDateString()}</td>
      {(canUpdate || canDelete) && (
        <td className="text-right align-top">
          <div className="flex justify-end space-x-2">
            {canUpdate && (
              <Button size="sm" variant="secondary" onClick={() => setEditingMethod(method)} className="p-1">
                <PencilIcon className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleDelete(method)}
                className="text-red-400 hover:text-red-300 p-1"
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        </td>
      )}
    </tr>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
        <CreditCardIcon className="h-5 w-5" />
        <span>Saved Payment Methods</span>
      </h2>
      <PaginatedTable
        apiCall={(params) => adminApi.getUserPaymentMethods({ ...params, user_id: userId })}
        renderHeader={renderHeader}
        renderRow={renderRow}
        itemsPerPage={10}
        errorAction="load user payment methods"
        loadingMessage="Loading payment methods..."
        minWidth="700px"
        inlineError={true}
        dependencies={[userId, refreshTrigger]}
        renderEmptyState={() => (
          <div className="text-center py-8 text-gray-400">No saved payment methods for this user</div>
        )}
        calculateStats={(methods, total) => (
          <div className="flex gap-4 text-sm text-gray-400">
            <span>
              Total: <span className="text-white font-medium">{total}</span>
            </span>
            <span>
              Enabled: <span className="text-green-400 font-medium">{methods.filter((m) => m.enabled).length}</span>
            </span>
          </div>
        )}
      />

      {editingMethod && (
        <EditUserPaymentMethodModal
          method={editingMethod}
          onClose={() => setEditingMethod(null)}
          onSuccess={refreshData}
        />
      )}
    </div>
  );
}

function EditUserPaymentMethodModal({
  method,
  onClose,
  onSuccess,
}: {
  method: AdminUserPaymentMethodInfo;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const adminApi = useAdminApi();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(method.name ?? "");
  const [isDefault, setIsDefault] = useState(method.is_default);
  const [enabled, setEnabled] = useState(method.enabled);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminApi.updateUserPaymentMethod(method.id, {
        name: name.trim() === "" ? null : name.trim(),
        is_default: isDefault,
        enabled,
      });
      success("Payment method updated");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to update payment method:", error);
      showError("Failed to update payment method", error instanceof Error ? error.message : undefined);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit Payment Method">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-white mb-2">Label</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="User-defined label (leave empty to clear)"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          Enabled
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          Default method (clears the flag on the user's other methods)
        </label>
        <div className="flex justify-end space-x-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
