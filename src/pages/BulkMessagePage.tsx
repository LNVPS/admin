import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { useAdminApi } from "../hooks/useAdminApi";
import type { AdminBulkMessageResult, AdminBulkMessageTarget, AdminHostInfo, AdminRegionInfo } from "../lib/api";
import { handleApiError } from "../lib/errorHandler";

type TargetMode = "all" | "targeted";

/** Parse a comma/space/newline separated list of positive integer ids. */
function parseIds(input: string): { ids: number[]; invalid: string[] } {
  const ids: number[] = [];
  const invalid: string[] = [];
  for (const token of input.split(/[\s,]+/).filter(Boolean)) {
    const n = Number(token);
    if (!Number.isInteger(n) || n <= 0) {
      invalid.push(token);
    } else if (!ids.includes(n)) {
      ids.push(n);
    }
  }
  return { ids, invalid };
}

function toggle(list: number[], id: number): number[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function BulkMessagePage() {
  const adminApi = useAdminApi();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [targetMode, setTargetMode] = useState<TargetMode>("all");
  const [userIdsInput, setUserIdsInput] = useState("");
  const [vmIdsInput, setVmIdsInput] = useState("");
  const [hostIds, setHostIds] = useState<number[]>([]);
  const [regionIds, setRegionIds] = useState<number[]>([]);
  const [hosts, setHosts] = useState<AdminHostInfo[]>([]);
  const [regions, setRegions] = useState<AdminRegionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [preview, setPreview] = useState<AdminBulkMessageResult | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [hostRes, regionRes] = await Promise.all([
          adminApi.getHosts({ limit: 200, offset: 0 }),
          adminApi.getRegions({ limit: 200, offset: 0 }),
        ]);
        if (cancelled) return;
        setHosts(hostRes.data);
        setRegions(regionRes.data);
      } catch (err) {
        if (!cancelled) setError(handleApiError(err, "load hosts and regions"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminApi]);

  const parsedUsers = parseIds(userIdsInput);
  const parsedVms = parseIds(vmIdsInput);
  const invalidIds = [...parsedUsers.invalid, ...parsedVms.invalid];

  const target: AdminBulkMessageTarget | undefined =
    targetMode === "all"
      ? undefined
      : {
          ...(parsedUsers.ids.length > 0 && { user_ids: parsedUsers.ids }),
          ...(parsedVms.ids.length > 0 && { vm_ids: parsedVms.ids }),
          ...(hostIds.length > 0 && { host_ids: hostIds }),
          ...(regionIds.length > 0 && { region_ids: regionIds }),
        };

  // The server rejects a target with only empty lists rather than treating it
  // as "everyone", so block that here instead of sending a guaranteed 400.
  const hasEmptyTarget = targetMode === "targeted" && target !== undefined && Object.keys(target).length === 0;
  const canSubmit =
    subject.trim().length > 0 && message.trim().length > 0 && !hasEmptyTarget && invalidIds.length === 0;

  // Any change to the message or audience invalidates a previously resolved blast radius.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset preview whenever the request changes
  useEffect(() => {
    setPreview(null);
  }, [subject, message, targetMode, userIdsInput, vmIdsInput, hostIds, regionIds]);

  const submit = async (dryRun: boolean) => {
    if (!canSubmit) {
      setError(
        hasEmptyTarget
          ? "Select at least one user, VM, host or region — or switch to all active customers"
          : invalidIds.length > 0
            ? `Invalid ids: ${invalidIds.join(", ")}`
            : "Both subject and message are required",
      );
      return;
    }

    if (dryRun) setIsPreviewing(true);
    else setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await adminApi.sendBulkMessage({
        subject: subject.trim(),
        message: message.trim(),
        ...(target && { target }),
        ...(dryRun && { dry_run: true }),
      });

      setPreview(result);

      if (!dryRun) {
        if (result.job_dispatched) {
          setSuccessMessage(
            `Bulk message job dispatched. Job ID: ${result.job_id}. You will receive a completion notification with delivery statistics when the job finishes.`,
          );
          setSubject("");
          setMessage("");
        } else {
          setError("Failed to dispatch bulk message job");
        }
      }
    } catch (err) {
      setError(handleApiError(err, dryRun ? "resolve bulk message recipients" : "send bulk message"));
    } finally {
      setIsPreviewing(false);
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setSubject("");
    setMessage("");
    setTargetMode("all");
    setUserIdsInput("");
    setVmIdsInput("");
    setHostIds([]);
    setRegionIds([]);
    setPreview(null);
    setError(null);
    setSuccessMessage(null);
  };

  const renderIdChips = <T extends { id: number; name: string }>(
    items: T[],
    selected: number[],
    onToggle: (id: number) => void,
    emptyLabel: string,
  ) => {
    if (items.length === 0) {
      return <p className="text-xs text-gray-500">{emptyLabel}</p>;
    }
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggle(item.id)}
            disabled={isLoading || isPreviewing}
            className={clsx(
              "px-2.5 py-1 rounded-md text-xs border transition-colors",
              selected.includes(item.id)
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-slate-700 border-slate-600 text-gray-300 hover:border-slate-400",
            )}
          >
            {item.name}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Bulk Message</h1>
        <p className="mt-2 text-gray-400">
          Message customers over their own contact preferences — everyone, or just the owners affected by an event.
        </p>
      </div>

      {/* Information Panel */}
      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
        <div className="flex items-start">
          <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
          <div className="space-y-2 text-sm">
            <p className="text-blue-300 font-medium">Targeting</p>
            <ul className="text-gray-300 list-disc list-inside space-y-1 ml-2">
              <li>
                <strong>All active customers</strong> — users with at least one non-deleted VM
              </li>
              <li>Users, VMs, hosts and regions are unioned and de-duplicated, so an owner is messaged once</li>
              <li>Users with no usable contact method are reported below, never silently dropped</li>
            </ul>
            <p className="text-blue-300 font-medium mt-3">Delivery</p>
            <p className="text-gray-300 ml-2">
              Sent to <em>every</em> channel the user opted into and supplied data for (email, NIP-17 DM, Telegram,
              WhatsApp) and that the server has configured.
            </p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
          <div className="flex items-start">
            <CheckCircleIcon className="h-5 w-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-green-300 text-sm">{successMessage}</div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-red-300 text-sm">{error}</div>
          </div>
        </div>
      )}

      {/* Message Form */}
      <div className="bg-slate-800 rounded-lg p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit(false);
          }}
          className="space-y-6"
        >
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
            <p className="mt-1 text-xs text-gray-500">{subject.length}/200 characters</p>
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
            <p className="mt-1 text-xs text-gray-500">{message.length}/5000 characters</p>
          </div>

          {/* Audience */}
          <div className="space-y-4 pt-2 border-t border-slate-700">
            <div className="pt-4">
              <span className="block text-sm font-medium text-gray-300 mb-2">Audience</span>
              <div className="flex gap-2">
                {(
                  [
                    ["all", "All active customers"],
                    ["targeted", "Specific users / VMs / hosts / regions"],
                  ] as [TargetMode, string][]
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTargetMode(mode)}
                    disabled={isLoading || isPreviewing}
                    className={clsx(
                      "px-3 py-1.5 rounded-md text-sm border transition-colors",
                      targetMode === mode
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-slate-700 border-slate-600 text-gray-300 hover:border-slate-400",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {targetMode === "targeted" && (
              <div className="space-y-4 bg-slate-900/40 border border-slate-700 rounded-lg p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="user-ids" className="block text-sm font-medium text-gray-300 mb-2">
                      User IDs
                    </label>
                    <input
                      type="text"
                      id="user-ids"
                      value={userIdsInput}
                      onChange={(e) => setUserIdsInput(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. 1, 2, 42"
                      disabled={isLoading || isPreviewing}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Messaged whether or not they currently own a VM
                      {parsedUsers.ids.length > 0 && ` · ${parsedUsers.ids.length} selected`}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="vm-ids" className="block text-sm font-medium text-gray-300 mb-2">
                      VM IDs
                    </label>
                    <input
                      type="text"
                      id="vm-ids"
                      value={vmIdsInput}
                      onChange={(e) => setVmIdsInput(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. 10, 11, 12"
                      disabled={isLoading || isPreviewing}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Messages the owners; deleted VMs select nobody
                      {parsedVms.ids.length > 0 && ` · ${parsedVms.ids.length} selected`}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="block text-sm font-medium text-gray-300 mb-2">Hosts</span>
                  {renderIdChips(hosts, hostIds, (id) => setHostIds(toggle(hostIds, id)), "No hosts available")}
                </div>

                <div>
                  <span className="block text-sm font-medium text-gray-300 mb-2">Regions</span>
                  {renderIdChips(
                    regions,
                    regionIds,
                    (id) => setRegionIds(toggle(regionIds, id)),
                    "No regions available",
                  )}
                </div>

                {invalidIds.length > 0 && <p className="text-xs text-red-400">Invalid ids: {invalidIds.join(", ")}</p>}
                {hasEmptyTarget && (
                  <p className="text-xs text-yellow-400">
                    Select at least one user, VM, host or region — an empty target is rejected, not treated as
                    "everyone".
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-700">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClear}
              disabled={isLoading || isPreviewing || (!subject && !message && targetMode === "all")}
            >
              Clear
            </Button>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void submit(true)}
                disabled={isLoading || isPreviewing || !canSubmit}
                className="flex items-center"
              >
                <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                {isPreviewing ? "Resolving..." : "Preview recipients"}
              </Button>

              <Button type="submit" disabled={isLoading || isPreviewing || !canSubmit} className="flex items-center">
                <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                {isLoading ? "Sending..." : "Send Bulk Message"}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Blast radius */}
      {preview && (
        <div className="bg-slate-800 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              {preview.job_dispatched ? "Dispatched" : "Blast radius (dry run — nothing sent)"}
            </h2>
            {preview.job_id && <span className="text-xs text-gray-400 font-mono">{preview.job_id}</span>}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="bg-slate-900/50 rounded-lg p-4">
              <p className="text-xs text-gray-400">Recipients matched</p>
              <p className="text-2xl font-bold text-white">{preview.recipient_count}</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <p className="text-xs text-gray-400">Reachable</p>
              <p className="text-2xl font-bold text-green-400">{preview.reachable_count}</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <p className="text-xs text-gray-400">Unreachable</p>
              <p
                className={clsx(
                  "text-2xl font-bold",
                  preview.unreachable_users.length > 0 ? "text-yellow-400" : "text-white",
                )}
              >
                {preview.unreachable_users.length}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-300 mb-2">Per channel</p>
            {Object.keys(preview.channel_counts).length === 0 ? (
              <p className="text-xs text-gray-500">No channel will be used.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(preview.channel_counts).map(([channel, count]) => (
                  <span key={channel} className="px-2.5 py-1 rounded-md text-xs bg-slate-700 text-gray-200">
                    {channel}: {count}
                  </span>
                ))}
              </div>
            )}
          </div>

          {preview.unreachable_users.length > 0 && (
            <div>
              <p className="text-sm font-medium text-yellow-300 mb-2">
                Matched but not contactable — no contact method on file
              </p>
              <ul className="text-sm text-gray-300 space-y-1 max-h-48 overflow-y-auto">
                {preview.unreachable_users.map((u) => (
                  <li key={u.user_id}>
                    #{u.user_id}
                    {u.billing_name ? ` — ${u.billing_name}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Warning Panel */}
      <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
        <div className="flex items-start">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-yellow-300 font-medium">Important Notes:</p>
            <ul className="text-gray-300 list-disc list-inside space-y-1 ml-2 mt-2">
              <li>Messages cannot be recalled once the job is dispatched — preview the recipients first</li>
              <li>The job is processed asynchronously — you'll receive a completion notification</li>
              <li>Please review your message carefully before sending</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
