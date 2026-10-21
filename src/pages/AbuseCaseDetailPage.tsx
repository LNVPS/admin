import { ArrowLeftIcon, ArrowPathIcon, ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "../components/Button";
import { Card, DetailList, DetailRow } from "../components/Card";
import { ErrorState } from "../components/ErrorState";
import { Modal } from "../components/Modal";
import { Pill } from "../components/Pill";
import { useAdminApi } from "../hooks/useAdminApi";
import { useApiCall } from "../hooks/useApiCall";
import { useUserRoles } from "../hooks/useUserRoles";
import type {
  AbuseActionKind,
  AbuseChallengeOutcome,
  AdminAbuseAction,
  AdminAbuseCaseDetail,
  AdminAbuseChallenge,
} from "../lib/api";
import { confirmDialog } from "../services/confirmService";
import { toastService } from "../services/toastService";
import { CASE_KIND_LABEL } from "./AbuseCasesPage";

const ACTION_LABEL: Record<AbuseActionKind, string> = {
  forwarded: "Forwarded to customer",
  restricted: "Restricted",
  suspended: "Suspended",
  terminated: "Terminated",
  reinstated: "Reinstated",
  no_action: "No action",
};

const ACTION_VARIANT: Record<AbuseActionKind, "default" | "warning" | "danger" | "success" | "primary"> = {
  forwarded: "primary",
  restricted: "warning",
  suspended: "danger",
  terminated: "danger",
  reinstated: "success",
  no_action: "default",
};

const DISABLES_VM: AbuseActionKind[] = ["suspended", "terminated"];

const CHALLENGE_WINDOW_DAYS = 183;

export function challengeDeadline(action: AdminAbuseAction): Date {
  return new Date(new Date(action.created).getTime() + CHALLENGE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

export function noticeState(action: AdminAbuseAction): { label: string; variant: "success" | "warning" | "default" } {
  if (action.kind === "no_action") return { label: "No notice needed", variant: "default" };
  if (action.notice_withheld) return { label: "Withheld", variant: "warning" };
  if (action.notified_at) return { label: "Customer notified", variant: "success" };
  return { label: "Not yet delivered", variant: "warning" };
}

export function AbuseCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const caseId = parseInt(id!, 10);
  const adminApi = useAdminApi();
  const { hasPermission } = useUserRoles();
  const canUpdate = hasPermission("abuse::update");
  const canCreate = hasPermission("abuse::create");

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showAction, setShowAction] = useState(false);
  const [challengeFor, setChallengeFor] = useState<AdminAbuseAction | null>(null);
  const [deciding, setDeciding] = useState<AdminAbuseChallenge | null>(null);

  const {
    data: abuse,
    loading,
    error,
    retry,
  } = useApiCall(() => adminApi.getAbuseCase(caseId), [caseId, refreshTrigger]);

  const refresh = () => setRefreshTrigger((n) => n + 1);

  if (error) return <ErrorState error={error} onRetry={retry} action="load abuse case" />;
  if (loading || !abuse) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-white">Loading case...</div>
      </div>
    );
  }

  const closed = abuse.closed_at != null;

  const handleClose = async () => {
    const ok = await confirmDialog({
      title: "Close Case",
      message: `Close case #${abuse.id}? No more decisions can be recorded on it, and it is deleted ${
        abuse.kind === "copyright_ca" && !abuse.proceedings_started ? "6" : "12"
      } months later.`,
      confirmText: "Close case",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await adminApi.closeAbuseCase(abuse.id);
      refresh();
    } catch (e) {
      toastService.error("Failed to close case", e instanceof Error ? e.message : undefined);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/abuse" className="text-slate-400 hover:text-white">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <ShieldExclamationIcon className="h-7 w-7 text-blue-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">Abuse Case #{abuse.id}</h1>
            <p className="text-sm text-slate-400">{CASE_KIND_LABEL[abuse.kind]}</p>
          </div>
          {closed ? <Pill variant="default">Closed</Pill> : <Pill variant="success">Open</Pill>}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={refresh}>
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </Button>
          {canUpdate && !closed && (
            <Button variant="secondary" size="sm" onClick={() => setShowAction(true)}>
              Record Decision
            </Button>
          )}
          {canUpdate && !closed && (
            <Button variant="ghost-danger" size="sm" onClick={handleClose}>
              Close Case
            </Button>
          )}
        </div>
      </div>

      {abuse.report_count_for_service > 1 && (
        <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-200">
          This is one of {abuse.report_count_for_service} reports about the same service. Repeated reports count towards
          termination even when each one is resolved.{" "}
          {abuse.vm_id != null && (
            <Link to={`/abuse?vm=${abuse.vm_id}`} className="underline">
              See them all
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Report">
          <DetailList>
            <DetailRow label="Summary" value={<span className="whitespace-pre-wrap">{abuse.summary}</span>} />
            <DetailRow
              label="VM"
              value={
                abuse.vm_id != null ? (
                  <Link to={`/vms/${abuse.vm_id}`} className="text-blue-400 hover:underline">
                    VM #{abuse.vm_id}
                  </Link>
                ) : (
                  <span className="text-slate-500">none</span>
                )
              }
            />
            <DetailRow
              label="Customer"
              value={
                abuse.user_id != null ? (
                  <Link to={`/users/${abuse.user_id}`} className="text-blue-400 hover:underline">
                    User #{abuse.user_id}
                  </Link>
                ) : (
                  <span className="text-slate-500">none</span>
                )
              }
            />
            <DetailRow label="Reported IP" value={abuse.reported_ip ?? "none"} />
            <DetailRow
              label="Incident"
              value={abuse.incident_at ? new Date(abuse.incident_at).toLocaleString() : "not given"}
            />
            <DetailRow label="Reporter" value={abuse.reporter_email ?? "not given"} />
            <DetailRow label="Opened" value={new Date(abuse.created).toLocaleString()} />
            {abuse.closed_at && <DetailRow label="Closed" value={new Date(abuse.closed_at).toLocaleString()} />}
            {abuse.kind === "copyright_ca" && (
              <DetailRow label="Proceedings started" value={abuse.proceedings_started ? "Yes" : "No"} />
            )}
          </DetailList>
        </Card>

        <Card title="Retention">
          <p className="text-sm text-slate-300">
            The worker deletes a closed case{" "}
            {abuse.kind === "copyright_ca" ? "six months after the notice arrived" : "12 months after it closes"}
            {abuse.kind === "copyright_ca" && abuse.proceedings_started
              ? ", or 12 months because proceedings have started"
              : ""}
            . Open cases are never deleted.
          </p>
        </Card>
      </div>

      <Card title="Decisions">
        {abuse.actions.length === 0 ? (
          <p className="text-sm text-slate-500">No decision recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {abuse.actions.map((a) => (
              <ActionRow
                key={a.id}
                action={a}
                challenges={abuse.challenges.filter((c) => c.action_id === a.id)}
                canCreate={canCreate}
                canUpdate={canUpdate}
                onChallenge={() => setChallengeFor(a)}
                onDecide={setDeciding}
              />
            ))}
          </div>
        )}
      </Card>

      {showAction && (
        <RecordActionModal
          abuse={abuse}
          onClose={() => setShowAction(false)}
          onDone={() => {
            setShowAction(false);
            refresh();
          }}
        />
      )}
      {challengeFor && (
        <RecordChallengeModal
          caseId={abuse.id}
          action={challengeFor}
          onClose={() => setChallengeFor(null)}
          onDone={() => {
            setChallengeFor(null);
            refresh();
          }}
        />
      )}
      {deciding && (
        <DecideChallengeModal
          challenge={deciding}
          onClose={() => setDeciding(null)}
          onDone={() => {
            setDeciding(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function ActionRow({
  action,
  challenges,
  canCreate,
  canUpdate,
  onChallenge,
  onDecide,
}: {
  action: AdminAbuseAction;
  challenges: AdminAbuseChallenge[];
  canCreate: boolean;
  canUpdate: boolean;
  onChallenge: () => void;
  onDecide: (c: AdminAbuseChallenge) => void;
}) {
  const notice = noticeState(action);
  const deadline = challengeDeadline(action);
  const open = deadline.getTime() > Date.now();
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Pill variant={ACTION_VARIANT[action.kind]}>{ACTION_LABEL[action.kind]}</Pill>
        <Pill variant={notice.variant}>{notice.label}</Pill>
        {!action.followed_report && <Pill variant="secondary">Own detection</Pill>}
        <span className="ml-auto text-xs text-slate-400">
          {new Date(action.created).toLocaleString()} by admin #{action.admin_user_id}
        </span>
      </div>
      <dl className="mt-3 space-y-2 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Reason</dt>
          <dd className="whitespace-pre-wrap text-slate-200">{action.reason}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Facts</dt>
          <dd className="whitespace-pre-wrap text-slate-200">{action.facts}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Legal basis</dt>
          <dd className="text-slate-200">{action.legal_basis ?? "Section 6 of the Terms of Service"}</dd>
        </div>
        {action.notice_withheld && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Notice withheld because</dt>
            <dd className="text-yellow-200">{action.notice_withheld}</dd>
          </div>
        )}
        {!action.notified_at && !action.notice_withheld && action.kind !== "no_action" && (
          <div className="text-xs text-yellow-300">
            The statement of reasons has not been delivered. The customer may have no email or other contact method, so
            tell them another way.
          </div>
        )}
      </dl>

      {challenges.length > 0 && (
        <div className="mt-4 space-y-3 border-t border-slate-700 pt-3">
          {challenges.map((c) => (
            <div key={c.id} className="rounded border border-slate-700 p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-slate-500">Challenge</span>
                {c.outcome ? (
                  <Pill variant={c.outcome === "reversed" ? "success" : "default"}>
                    {c.outcome === "reversed" ? "Reversed" : "Upheld"}
                  </Pill>
                ) : (
                  <Pill variant="warning">Awaiting review</Pill>
                )}
                <span className="ml-auto text-xs text-slate-400">{new Date(c.received_at).toLocaleString()}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-slate-200">{c.message}</p>
              {c.response && (
                <p className="mt-2 whitespace-pre-wrap border-l-2 border-slate-600 pl-3 text-slate-300">{c.response}</p>
              )}
              {!c.outcome && canUpdate && (
                <div className="mt-2">
                  <Button size="sm" onClick={() => onDecide(c)}>
                    Decide
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {canCreate && action.kind !== "no_action" && (
        <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
          {open ? (
            <>
              <span>Can be challenged until {deadline.toLocaleDateString()}</span>
              <Button variant="ghost" size="sm" onClick={onChallenge}>
                Record a challenge
              </Button>
            </>
          ) : (
            <span>The six month window to challenge this closed on {deadline.toLocaleDateString()}</span>
          )}
        </div>
      )}
    </div>
  );
}

function RecordActionModal({
  abuse,
  onClose,
  onDone,
}: {
  abuse: AdminAbuseCaseDetail;
  onClose: () => void;
  onDone: () => void;
}) {
  const adminApi = useAdminApi();
  const [saving, setSaving] = useState(false);
  const [kind, setKind] = useState<AbuseActionKind>("forwarded");
  const [reason, setReason] = useState("");
  const [facts, setFacts] = useState("");
  const [legalBasis, setLegalBasis] = useState("");
  const [followedReport, setFollowedReport] = useState(true);
  const [withhold, setWithhold] = useState(false);
  const [withheldReason, setWithheldReason] = useState("");

  const valid = reason.trim() !== "" && facts.trim() !== "" && (!withhold || withheldReason.trim() !== "");
  const disables = DISABLES_VM.includes(kind) && abuse.vm_id != null;
  const notifies = kind !== "no_action" && !withhold && abuse.user_id != null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    if (disables) {
      const ok = await confirmDialog({
        title: kind === "terminated" ? "Terminate service" : "Suspend service",
        message: `VM #${abuse.vm_id} will be disabled now.${notifies ? " The customer is emailed a statement of reasons." : ""}`,
        confirmText: kind === "terminated" ? "Terminate" : "Suspend",
        variant: "danger",
      });
      if (!ok) return;
    }
    setSaving(true);
    try {
      await adminApi.recordAbuseAction(abuse.id, {
        kind,
        reason: reason.trim(),
        facts: facts.trim(),
        legal_basis: legalBasis.trim() === "" ? undefined : legalBasis.trim(),
        followed_report: followedReport,
        notice_withheld: withhold ? withheldReason.trim() : undefined,
      });
      toastService.success("Decision recorded", notifies ? "The customer is being emailed" : undefined);
      onDone();
    } catch (error) {
      console.error("Failed to record decision:", error);
      toastService.error("Failed to record decision", error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Record Decision" size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="decision" className="mb-1 block text-xs font-medium text-white">
            Decision
          </label>
          <select id="decision" value={kind} onChange={(e) => setKind(e.target.value as AbuseActionKind)}>
            {(Object.keys(ACTION_LABEL) as AbuseActionKind[]).map((k) => (
              <option key={k} value={k}>
                {ACTION_LABEL[k]}
              </option>
            ))}
          </select>
          {disables && <p className="mt-1 text-xs text-red-300">This disables VM #{abuse.vm_id} immediately.</p>}
          {kind === "reinstated" && abuse.vm_id != null && (
            <p className="mt-1 text-xs text-green-300">This re-enables VM #{abuse.vm_id}.</p>
          )}
        </div>
        <div>
          <label htmlFor="facts-it-is-based-on" className="mb-1 block text-xs font-medium text-white">
            Facts it is based on
          </label>
          <textarea
            id="facts-it-is-based-on"
            rows={3}
            value={facts}
            onChange={(e) => setFacts(e.target.value)}
            required
          />
          <p className="mt-1 text-xs text-slate-400">
            Sent to the customer. Describe what was seen, not who reported it.
          </p>
        </div>
        <div>
          <label htmlFor="reason" className="mb-1 block text-xs font-medium text-white">
            Reason
          </label>
          <textarea id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="law-or-terms-section" className="mb-1 block text-xs font-medium text-white">
            Law or Terms section
          </label>
          <input
            id="law-or-terms-section"
            type="text"
            value={legalBasis}
            onChange={(e) => setLegalBasis(e.target.value)}
            placeholder="Defaults to: Section 6 of our Terms of Service"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input type="checkbox" checked={followedReport} onChange={(e) => setFollowedReport(e.target.checked)} />
          This followed a report (untick if we found it ourselves)
        </label>
        <div className="rounded border border-slate-700 p-3">
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" checked={withhold} onChange={(e) => setWithhold(e.target.checked)} />
            The law requires me not to tell the customer
          </label>
          {withhold && (
            <div className="mt-2">
              <input
                type="text"
                value={withheldReason}
                onChange={(e) => setWithheldReason(e.target.value)}
                placeholder="Why, e.g. it would interfere with a criminal investigation"
              />
              <p className="mt-1 text-xs text-slate-400">
                No email is sent and the customer cannot see this decision. Use it only where the law requires.
              </p>
            </div>
          )}
        </div>
        <div className="flex justify-end space-x-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !valid} variant={disables ? "danger" : "primary"}>
            {saving ? "Saving..." : "Record"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function RecordChallengeModal({
  caseId,
  action,
  onClose,
  onDone,
}: {
  caseId: number;
  action: AdminAbuseAction;
  onClose: () => void;
  onDone: () => void;
}) {
  const adminApi = useAdminApi();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const valid = message.trim() !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    try {
      await adminApi.recordAbuseChallenge(caseId, { action_id: action.id, message: message.trim() });
      toastService.success("Challenge recorded");
      onDone();
    } catch (error) {
      console.error("Failed to record challenge:", error);
      toastService.error("Failed to record challenge", error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Record Challenge" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-300">
          For when the customer challenged this decision by email. Paste what they wrote.
        </p>
        <textarea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} required />
        <div className="flex justify-end space-x-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !valid}>
            {saving ? "Saving..." : "Record"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function DecideChallengeModal({
  challenge,
  onClose,
  onDone,
}: {
  challenge: AdminAbuseChallenge;
  onClose: () => void;
  onDone: () => void;
}) {
  const adminApi = useAdminApi();
  const [saving, setSaving] = useState(false);
  const [outcome, setOutcome] = useState<AbuseChallengeOutcome>("upheld");
  const [response, setResponse] = useState("");
  const valid = response.trim() !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    try {
      await adminApi.decideAbuseChallenge(challenge.id, { outcome, response: response.trim() });
      toastService.success("Challenge decided", "The customer is being emailed the result");
      onDone();
    } catch (error) {
      console.error("Failed to decide challenge:", error);
      toastService.error("Failed to decide challenge", error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Decide Challenge" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded border border-slate-700 bg-slate-900/40 p-3 text-sm text-slate-200">
          <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">Customer wrote</div>
          <p className="whitespace-pre-wrap">{challenge.message}</p>
        </div>
        <div>
          <label htmlFor="outcome" className="mb-1 block text-xs font-medium text-white">
            Outcome
          </label>
          <select id="outcome" value={outcome} onChange={(e) => setOutcome(e.target.value as AbuseChallengeOutcome)}>
            <option value="upheld">Uphold the decision</option>
            <option value="reversed">Reverse the decision (re-enables a disabled VM)</option>
          </select>
        </div>
        <div>
          <label htmlFor="reply-to-the-customer" className="mb-1 block text-xs font-medium text-white">
            Reply to the customer
          </label>
          <textarea
            id="reply-to-the-customer"
            rows={5}
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            required
          />
          <p className="mt-1 text-xs text-slate-400">Emailed to the customer along with the outcome.</p>
        </div>
        <div className="flex justify-end space-x-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !valid}>
            {saving ? "Saving..." : "Send decision"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
