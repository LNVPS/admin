import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  LockClosedIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "../components/Button";
import { ErrorState } from "../components/ErrorState";
import { Modal } from "../components/Modal";
import { PaginatedTable } from "../components/PaginatedTable";
import { useAdminApi } from "../hooks/useAdminApi";
import { useApiCall } from "../hooks/useApiCall";
import { useToast } from "../hooks/useToast";
import { useUserRoles } from "../hooks/useUserRoles";
import type { AdminAgentConversationInfo, AdminAgentMessageInfo, AgentMessageChannel } from "../lib/api";
import { confirmDialog } from "../services/confirmService";

const CHANNEL_LABEL: Record<AgentMessageChannel, string> = {
  email: "Email",
  nostr: "Nostr",
  webchat: "Live chat",
};

/**
 * A turn's colour, by who produced it.
 *
 * Tool rows are deliberately dimmer than prose: they are the machinery behind a
 * reply, and an admin reading a complaint wants the conversation to stand out
 * from it.
 */
const ROLE_CLASS: Record<string, string> = {
  user: "border-blue-500/40 bg-blue-500/5",
  assistant: "border-emerald-500/40 bg-emerald-500/5",
  tool: "border-slate-700 bg-slate-800/40",
};

const ROLE_LABEL: Record<string, string> = {
  user: "Customer",
  assistant: "Agent",
  tool: "Tool result",
};

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export function AgentConversationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const conversationId = id ? Number.parseInt(id, 10) : Number.NaN;
  const adminApi = useAdminApi();
  const { success, error: toastError } = useToast();
  const { hasPermission } = useUserRoles();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingMemory, setEditingMemory] = useState(false);

  const canUpdate = hasPermission("support_agent::update");

  const {
    data: conversation,
    loading,
    error,
    retry,
  } = useApiCall(() => adminApi.getAgentConversation(conversationId), [conversationId, refreshTrigger]);

  const refreshData = () => setRefreshTrigger((prev) => prev + 1);

  if (error) {
    return <ErrorState error={error} onRetry={retry} action="view this conversation" />;
  }

  if (loading || !conversation) {
    return (
      <div className="flex items-center justify-center gap-3 py-16">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
        <span className="text-sm text-slate-400">Loading conversation…</span>
      </div>
    );
  }

  const isPublic = conversation.kind === "nostr";

  const renderHeader = () => (
    <>
      <th className="w-16">#</th>
      <th>Turn</th>
      <th>Message</th>
      <th>When</th>
    </>
  );

  const renderRow = (message: AdminAgentMessageInfo, index: number) => (
    <tr key={message.id || index} className={message.compacted ? "opacity-60" : ""}>
      <td className="whitespace-nowrap align-top text-gray-500">{message.id}</td>
      <td className="align-top">
        <div
          className={`inline-flex flex-col gap-1 rounded-lg border px-2 py-1 ${ROLE_CLASS[message.role] ?? ROLE_CLASS.tool}`}
        >
          <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-white">
            {ROLE_LABEL[message.role] ?? message.role}
          </span>
          <span className="whitespace-nowrap text-[10px] text-slate-400">{CHANNEL_LABEL[message.channel]}</span>
        </div>
        {message.compacted && (
          <div
            className="mt-1 whitespace-nowrap text-[10px] uppercase tracking-wider text-slate-500"
            title="At or below the watermark: the agent replays a summary of this, not the message itself"
          >
            summarised
          </div>
        )}
      </td>
      <td className="align-top">
        <div className="max-w-[52rem] space-y-2">
          {message.content !== null ? (
            <div className="whitespace-pre-wrap break-words text-sm text-gray-200">{message.content}</div>
          ) : (
            // Distinct from an empty reply: this turn produced no prose at all.
            <div className="text-xs italic text-gray-500">no prose — this turn only requested tools</div>
          )}

          {message.tool_calls?.map((call) => (
            <div key={call.id} className="rounded-md border border-slate-700 bg-slate-900/60 p-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <WrenchScrewdriverIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                <span className="font-mono">{call.name}</span>
              </div>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] text-slate-400">
                {call.arguments}
              </pre>
            </div>
          ))}

          {message.tool_call_id && (
            <div className="font-mono text-[11px] text-slate-500">answers call {message.tool_call_id}</div>
          )}
        </div>
      </td>
      <td className="align-top whitespace-nowrap text-xs text-gray-500">{formatDateTime(message.created)}</td>
    </tr>
  );

  const renderEmptyState = () => (
    <div className="text-center py-12">
      <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-600" />
      <h3 className="mt-2 text-sm font-medium text-gray-300">No messages</h3>
      <p className="mt-1 text-sm text-gray-500">This thread exists but has never carried a message.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link to="/agent/conversations" className="inline-flex items-center text-sm text-blue-400 hover:underline">
            <ArrowLeftIcon className="mr-1 h-4 w-4" />
            All conversations
          </Link>
          <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold text-white">
            {isPublic ? (
              <GlobeAltIcon className="h-5 w-5 shrink-0 text-yellow-400" />
            ) : (
              <LockClosedIcon className="h-5 w-5 shrink-0 text-slate-500" />
            )}
            <span className="truncate font-mono text-base">{conversation.conversation_key}</span>
          </h1>
          <div className="mt-1 text-sm text-slate-400">
            {conversation.message_count} message{conversation.message_count === 1 ? "" : "s"} ·{" "}
            {conversation.user_id !== null ? (
              <Link to={`/users/${conversation.user_id}`} className="text-blue-400 hover:underline">
                user #{conversation.user_id}
              </Link>
            ) : (
              "no matching account"
            )}{" "}
            · last message {formatDateTime(conversation.last_message_at)}
          </div>
        </div>
        <Button variant="secondary" onClick={refreshData}>
          <ArrowPathIcon className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* A kind-1 thread is readable by the whole relay network. An admin acting
          on what they read here needs to know that before they reply anywhere. */}
      {isPublic && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-200">
          <GlobeAltIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Public thread. These are Nostr kind-1 posts, readable by the whole relay network, and are kept separate from
            the customer's private history on purpose.
          </span>
        </div>
      )}

      <MemoryPanel conversation={conversation} canUpdate={canUpdate} onEdit={() => setEditingMemory(true)} />

      <PaginatedTable
        apiCall={(params) => adminApi.getAgentConversationMessages(conversationId, params)}
        renderHeader={renderHeader}
        renderRow={renderRow}
        renderEmptyState={renderEmptyState}
        itemsPerPage={25}
        errorAction="view this transcript"
        loadingMessage="Loading transcript..."
        dependencies={[conversationId, refreshTrigger]}
        minWidth="1000px"
        inlineError
      />

      {editingMemory && (
        <EditMemoryModal
          conversation={conversation}
          onClose={() => setEditingMemory(false)}
          onSuccess={() => {
            setEditingMemory(false);
            success("Agent memory updated", "The transcript itself is unchanged.");
            refreshData();
          }}
          onError={(message) => toastError("Failed to update memory", message)}
        />
      )}
    </div>
  );
}

/**
 * The agent's memory of the thread — what it actually replays to the model.
 *
 * Shown above the transcript because it is the thing an admin came here to
 * change: the transcript explains what happened, this explains what the agent
 * still believes.
 */
function MemoryPanel({
  conversation,
  canUpdate,
  onEdit,
}: {
  conversation: AdminAgentConversationInfo;
  canUpdate: boolean;
  onEdit: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Agent memory</div>
          <p className="mt-1 text-xs text-slate-500">
            What the model replays next turn: this summary in place of everything up to message #
            {conversation.compacted_upto}, then every later message verbatim.
          </p>
        </div>
        {canUpdate && (
          <Button variant="secondary" size="sm" onClick={onEdit}>
            Edit memory
          </Button>
        )}
      </div>

      {conversation.summary ? (
        <div className="whitespace-pre-wrap break-words rounded-md border border-slate-700 bg-slate-900/60 p-3 text-sm text-gray-200">
          {conversation.summary}
        </div>
      ) : (
        <div className="text-sm text-slate-500">
          No summary. Nothing has been compacted yet, or it was cleared — the agent replays messages above the watermark
          and nothing else.
        </div>
      )}

      <div className="mt-2 text-xs text-slate-500">
        Watermark: {conversation.compacted_upto === 0 ? "none (0)" : `message #${conversation.compacted_upto}`}
      </div>
    </div>
  );
}

/** Rewrite or clear the summary, and optionally move the watermark. */
function EditMemoryModal({
  conversation,
  onClose,
  onSuccess,
  onError,
}: {
  conversation: AdminAgentConversationInfo;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const adminApi = useAdminApi();
  const [summary, setSummary] = useState(conversation.summary ?? "");
  const [watermark, setWatermark] = useState(String(conversation.compacted_upto));
  const [saving, setSaving] = useState(false);

  const parsedWatermark = Number.parseInt(watermark, 10);
  const watermarkChanged = !Number.isNaN(parsedWatermark) && parsedWatermark !== conversation.compacted_upto;
  // Winding the watermark back to 0 makes the next turn replay the whole
  // transcript — worth saying out loud before it is done, not after.
  const replaysEverything = watermarkChanged && parsedWatermark === 0 && conversation.message_count > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      replaysEverything &&
      !(await confirmDialog({
        title: "Replay the whole transcript?",
        message: `Setting the watermark to 0 makes the agent's next turn replay all ${conversation.message_count} messages as context. On a long thread that is slow and expensive. Continue?`,
      }))
    ) {
      return;
    }

    setSaving(true);
    try {
      await adminApi.updateAgentConversation(conversation.id, {
        // Empty means clear: a summary of "" would be a memory of nothing,
        // which the agent would still inject into its prompt.
        summary: summary.trim() === "" ? null : summary,
        ...(watermarkChanged ? { compacted_upto: parsedWatermark } : {}),
      });
      onSuccess();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit agent memory" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-start gap-2 rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-xs text-slate-400">
          <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <span>
            This changes only what the agent remembers. The transcript is append-only and nothing here edits or deletes
            a message.
          </span>
        </div>

        <div>
          <label htmlFor="agent-memory-summary" className="mb-2 block text-xs font-medium text-white">
            Summary
          </label>
          <textarea
            id="agent-memory-summary"
            rows={8}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
            placeholder="Leave blank to clear the agent's memory of this thread"
          />
          <p className="mt-1 text-xs text-slate-400">
            Clearing this is the safe reset: the agent forgets what it believed, and the next prompt is still bounded by
            the messages above the watermark.
          </p>
        </div>

        <div>
          <label htmlFor="agent-memory-watermark" className="mb-2 block text-xs font-medium text-white">
            Watermark (message id)
          </label>
          <input
            id="agent-memory-watermark"
            type="number"
            min="0"
            value={watermark}
            onChange={(e) => setWatermark(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white"
          />
          <p className="mt-1 text-xs text-slate-400">
            Messages at or below this id are replayed as the summary instead of verbatim. It cannot be set past the last
            message in the thread.
          </p>
          {replaysEverything && (
            <p className="mt-1 flex items-start gap-1 text-xs text-yellow-500/90">
              <ExclamationTriangleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                0 makes the next turn replay all {conversation.message_count} messages — slow and expensive on a long
                thread. Use it only to force a re-summarisation from scratch.
              </span>
            </p>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save memory"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
