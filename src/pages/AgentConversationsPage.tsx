import { ArrowPathIcon, ChatBubbleLeftRightIcon, GlobeAltIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import { countActiveFilters, FilterBar, FilterButton, type FilterField } from "../components/FilterBar";
import { PaginatedTable } from "../components/PaginatedTable";
import { StatsHeader } from "../components/StatsHeader";
import { useAdminApi } from "../hooks/useAdminApi";
import type { AdminAgentConversationInfo, AgentConversationKind } from "../lib/api";

/**
 * Colours for a thread's privacy class.
 *
 * `nostr` is amber on purpose: a public kind-1 thread is readable by the whole
 * relay network, and that is the one distinction on this page that changes what
 * an admin may safely discuss in it.
 */
const KIND_CLASS: Record<AgentConversationKind, string> = {
  user: "border border-blue-500/40 bg-blue-500/10 text-blue-300",
  email: "border border-slate-600 bg-slate-700/40 text-slate-300",
  pubkey: "border border-slate-600 bg-slate-700/40 text-slate-300",
  nostr: "border border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  unknown: "border border-slate-600 bg-slate-700/40 text-slate-400",
};

const KIND_LABEL: Record<AgentConversationKind, string> = {
  user: "Account",
  email: "Email",
  pubkey: "Nostr DM",
  nostr: "Public",
  unknown: "Unknown",
};

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

/** The identity half of a conversation key, without its namespace prefix. */
function keyValue(conversationKey: string): string {
  const [, ...rest] = conversationKey.split(":");
  return rest.length > 0 ? rest.join(":") : conversationKey;
}

export function AgentConversationsPage() {
  const adminApi = useAdminApi();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [userIdFilter, setUserIdFilter] = useState("");

  const refreshData = () => setRefreshTrigger((prev) => prev + 1);

  const filterFields: FilterField[] = [
    {
      key: "search",
      kind: "text",
      label: "Conversation key",
      value: searchFilter,
      onChange: setSearchFilter,
      placeholder: "user:42, an address, or nostr: for public threads",
    },
    {
      key: "user_id",
      kind: "text",
      label: "User ID",
      value: userIdFilter,
      onChange: setUserIdFilter,
      placeholder: "42",
    },
  ];

  const renderHeader = () => (
    <>
      <th className="w-16">ID</th>
      <th>Thread</th>
      <th>User</th>
      <th>Messages</th>
      <th>Agent memory</th>
      <th>Last message</th>
      <th className="text-right">Actions</th>
    </>
  );

  const renderRow = (conversation: AdminAgentConversationInfo, index: number) => (
    <tr key={conversation.id || index}>
      <td className="whitespace-nowrap align-top text-white">{conversation.id}</td>
      <td className="align-top">
        <div className="min-w-0 max-w-[20rem]">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${KIND_CLASS[conversation.kind]}`}
              title={
                conversation.kind === "nostr"
                  ? "Public kind-1 thread — readable by the whole relay network"
                  : "Private thread"
              }
            >
              {conversation.kind === "nostr" ? (
                <GlobeAltIcon className="h-3 w-3" />
              ) : (
                <LockClosedIcon className="h-3 w-3" />
              )}
              {KIND_LABEL[conversation.kind]}
            </span>
          </div>
          <div className="mt-1 truncate font-mono text-xs text-gray-400" title={conversation.conversation_key}>
            {keyValue(conversation.conversation_key)}
          </div>
        </div>
      </td>
      <td className="align-top">
        {conversation.user_id !== null ? (
          <Link to={`/users/${conversation.user_id}`} className="text-blue-400 hover:underline">
            #{conversation.user_id}
          </Link>
        ) : (
          <span className="text-gray-500" title="The sender did not match any account">
            anonymous
          </span>
        )}
      </td>
      <td className="align-top text-gray-300">
        {conversation.message_count}
        {conversation.compacted_upto > 0 && (
          <div
            className="text-[11px] text-gray-500"
            title="Messages at or below the watermark are replayed to the model as a summary, not verbatim"
          >
            watermark #{conversation.compacted_upto}
          </div>
        )}
      </td>
      <td className="align-top">
        {conversation.summary ? (
          <div className="max-w-[24rem] truncate text-xs text-gray-300" title={conversation.summary}>
            {conversation.summary}
          </div>
        ) : (
          <span className="text-xs text-gray-500">none</span>
        )}
      </td>
      <td className="align-top whitespace-nowrap text-gray-400">{formatDateTime(conversation.last_message_at)}</td>
      <td className="text-right align-top">
        <Link to={`/agent/conversations/${conversation.id}`}>
          <Button variant="secondary" size="sm">
            Transcript
          </Button>
        </Link>
      </td>
    </tr>
  );

  const renderEmptyState = () => (
    <div className="text-center py-12">
      <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-600" />
      <h3 className="mt-2 text-sm font-medium text-gray-300">No conversations</h3>
      <p className="mt-1 text-sm text-gray-500">
        {countActiveFilters(filterFields) > 0
          ? "No threads match these filters."
          : "Support threads appear here once a customer writes in."}
      </p>
    </div>
  );

  const calculateStats = (conversations: AdminAgentConversationInfo[], totalItems: number) => (
    <StatsHeader
      title="Support Conversations"
      subtitle="What the support agent has said to customers, and what it remembers of them."
      stats={[
        { label: "Total", value: totalItems },
        { label: "Public threads", value: conversations.filter((c) => c.kind === "nostr").length, tone: "warning" },
        { label: "Unlinked senders", value: conversations.filter((c) => c.user_id === null).length, tone: "muted" },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <FilterButton
            open={filtersOpen}
            activeCount={countActiveFilters(filterFields)}
            onClick={() => setFiltersOpen((o) => !o)}
          />
          <Button variant="secondary" onClick={refreshData}>
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      }
    />
  );

  const userId = Number.parseInt(userIdFilter, 10);

  return (
    <div className="space-y-6">
      <PaginatedTable
        apiCall={(params) =>
          adminApi.getAgentConversations({
            ...params,
            search: searchFilter.trim() || undefined,
            user_id: Number.isNaN(userId) ? undefined : userId,
          })
        }
        renderHeader={renderHeader}
        renderRow={renderRow}
        renderEmptyState={renderEmptyState}
        calculateStats={calculateStats}
        toolbar={
          <FilterBar
            open={filtersOpen}
            fields={filterFields}
            onClear={() => {
              setSearchFilter("");
              setUserIdFilter("");
            }}
            onClose={() => setFiltersOpen(false)}
          />
        }
        itemsPerPage={20}
        errorAction="view support conversations"
        loadingMessage="Loading conversations..."
        dependencies={[refreshTrigger, searchFilter, userIdFilter]}
        minWidth="1100px"
      />

      <p className="text-xs text-slate-500">
        Search matches the conversation key only — message content is encrypted at rest, so the server cannot search it.
      </p>
    </div>
  );
}
