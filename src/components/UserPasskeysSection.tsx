import { FingerPrintIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import { useToast } from "../hooks/useToast";
import { useUserRoles } from "../hooks/useUserRoles";
import type { AdminPasskeyInfo } from "../lib/api";
import { Button } from "./Button";
import { PaginatedTable } from "./PaginatedTable";

function passkeyLabel(passkey: AdminPasskeyInfo): string {
  return passkey.name?.trim() || "Unnamed passkey";
}

export function UserPasskeysSection({ userId }: { userId: number }) {
  const adminApi = useAdminApi();
  const { success, error: showError } = useToast();
  const { hasPermission } = useUserRoles();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const canRevoke = hasPermission("users::update");

  const refreshData = () => setRefreshTrigger((prev) => prev + 1);

  const handleRevoke = async (passkey: AdminPasskeyInfo) => {
    if (
      !confirm(
        `Revoke passkey "${passkeyLabel(passkey)}"? The user will no longer be able to log in with this device. ` +
          "Passwordless accounts must keep at least one passkey.",
      )
    ) {
      return;
    }
    try {
      await adminApi.revokeUserPasskey(userId, passkey.id);
      success("Passkey revoked");
      refreshData();
    } catch (error) {
      console.error("Failed to revoke passkey:", error);
      showError("Failed to revoke passkey", error instanceof Error ? error.message : undefined);
    }
  };

  const renderHeader = () => (
    <>
      <th className="w-14">ID</th>
      <th>Device</th>
      <th>Credential ID</th>
      <th>Created</th>
      <th>Last Used</th>
      {canRevoke && <th className="text-right">Actions</th>}
    </>
  );

  const renderRow = (passkey: AdminPasskeyInfo, index: number) => (
    <tr key={passkey.id || index}>
      <td className="whitespace-nowrap align-top text-white">{passkey.id}</td>
      <td className="align-top">
        <div className="font-medium text-white">{passkeyLabel(passkey)}</div>
      </td>
      <td className="align-top">
        <div className="max-w-[16rem] truncate font-mono text-xs text-slate-400" title={passkey.cred_id}>
          {passkey.cred_id}
        </div>
      </td>
      <td className="align-top text-gray-300 text-sm">{new Date(passkey.created).toLocaleDateString()}</td>
      <td className="align-top text-gray-300 text-sm">
        {passkey.last_used ? (
          new Date(passkey.last_used).toLocaleString()
        ) : (
          <span className="text-slate-500">Never</span>
        )}
      </td>
      {canRevoke && (
        <td className="text-right align-top">
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleRevoke(passkey)}
              className="text-red-400 hover:text-red-300 p-1"
              title="Revoke Passkey"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        </td>
      )}
    </tr>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
        <FingerPrintIcon className="h-5 w-5" />
        <span>Passkeys</span>
      </h2>
      <PaginatedTable
        apiCall={async () => {
          const passkeys = await adminApi.getUserPasskeys(userId);
          return { data: passkeys, total: passkeys.length, limit: passkeys.length, offset: 0 };
        }}
        renderHeader={renderHeader}
        renderRow={renderRow}
        itemsPerPage={10}
        errorAction="load user passkeys"
        loadingMessage="Loading passkeys..."
        minWidth="700px"
        inlineError={true}
        dependencies={[userId, refreshTrigger]}
        renderEmptyState={() => (
          <div className="text-center py-8 text-gray-400">No passkeys registered for this user</div>
        )}
        calculateStats={(passkeys, total) => (
          <div className="flex gap-4 text-sm text-gray-400">
            <span>
              Total: <span className="text-white font-medium">{total}</span>
            </span>
            <span>
              Used: <span className="text-green-400 font-medium">{passkeys.filter((p) => p.last_used).length}</span>
            </span>
          </div>
        )}
      />
    </div>
  );
}
