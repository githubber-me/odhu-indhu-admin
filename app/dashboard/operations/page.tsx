import Link from "next/link";
import {
  AlertTriangle,
  Activity,
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  HardDriveUpload,
  Headphones,
  KeyRound,
  MonitorSmartphone,
  Sparkles,
  Trophy,
  UserRound,
  Workflow,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { StatusPill } from "@/components/status-pill";
import {
  getOperationsData,
  operationViews,
  type OperationEvent,
  type OperationView,
} from "@/lib/data";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Operations" };
export const dynamic = "force-dynamic";

function formatBytes(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const filters: { value: OperationView; label: string }[] = [
  { value: "all", label: "All events" },
  { value: "attention", label: "Needs attention" },
  { value: "errors", label: "Errors" },
  { value: "healthy", label: "Successful" },
  { value: "study", label: "Study" },
  { value: "topic", label: "Topics" },
  { value: "quiz", label: "Quizzes" },
  { value: "voice", label: "Voice" },
  { value: "report", label: "Reports" },
  { value: "user", label: "Users" },
  { value: "api", label: "API" },
  { value: "client", label: "Browser" },
  { value: "auth", label: "Authentication" },
  { value: "storage", label: "Storage" },
];

const eventIcons = {
  study: BookOpenCheck,
  topic: Sparkles,
  quiz: Trophy,
  voice: Headphones,
  report: FileText,
  user: UserRound,
  api: Activity,
  client: MonitorSmartphone,
  auth: KeyRound,
  storage: HardDriveUpload,
};

function EventIcon({ event }: { event: OperationEvent }) {
  const Icon = eventIcons[event.category as keyof typeof eventIcons] ?? Workflow;
  return <Icon size={17} />;
}

function queryHref(view: OperationView, page?: number) {
  const pageQuery = page && page > 1 ? `&page=${page}` : "";
  return `/dashboard/operations?view=${view}${pageQuery}#event-ledger`;
}

export default async function OperationsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; page?: string }>;
}) {
  const params = await searchParams;
  const requestedView = params.view as OperationView;
  const view = operationViews.includes(requestedView) ? requestedView : "all";
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const { voiceNotes, reports, pipeline, recordCounts, storage, events, eventCounts, eventPagination } =
    await getOperationsData(view, page);
  const healthy = pipeline.reduce((sum, row) => sum + (["ready", "complete", "completed", "success"].includes(row.status) ? row.count : 0), 0);
  const attention = pipeline.reduce((sum, row) => sum + (["failed", "error", "partial"].includes(row.status) ? row.count : 0), 0);
  const totalPages = Math.max(1, Math.ceil(eventPagination.total / eventPagination.pageSize));

  return (
    <main>
      <div className="page-heading compact-heading">
        <div><p className="eyebrow">System health</p><h1>Operations</h1><p>Monitor generation jobs, weekly voice notes, and learner reports.</p></div>
        <div className="health-stack">
          <span className="system-health"><i /> Database connected</span>
          <span className={storage.tokenReady && storage.storeReady ? "system-health" : "system-health warning"}>
            <i /> {storage.tokenReady && storage.storeReady ? "Private voice storage connected" : "Voice storage needs configuration"}
          </span>
        </div>
      </div>

      <div className="summary-strip four-up operation-summary">
        <Link href={queryHref("healthy")}><span className="summary-icon green"><CheckCircle2 size={17} /></span><strong>{healthy}</strong><span>Healthy jobs</span><ChevronRight className="summary-arrow" size={16} /></Link>
        <Link href={queryHref("attention")}><span className="summary-icon amber"><AlertTriangle size={17} /></span><strong>{attention}</strong><span>Need attention</span><ChevronRight className="summary-arrow" size={16} /></Link>
        <Link href={queryHref("voice")}><span className="summary-icon blue"><Headphones size={17} /></span><strong>{recordCounts.voiceNotes}</strong><span>Voice notes</span><ChevronRight className="summary-arrow" size={16} /></Link>
        <Link href={queryHref("report")}><span className="summary-icon violet"><FileText size={17} /></span><strong>{recordCounts.reports}</strong><span>Weekly reports</span><ChevronRight className="summary-arrow" size={16} /></Link>
      </div>

      <section className="panel pipeline-panel">
        <div className="panel-heading"><div><h2>Pipeline health</h2><p>Current status across asynchronous workflows</p></div></div>
        {pipeline.length ? (
          <div className="pipeline-grid">
            {pipeline.map((row) => (
              <Link
                href={queryHref(row.pipeline.startsWith("Study") ? "study" : row.pipeline.startsWith("Topic") ? "topic" : "voice")}
                className="pipeline-item"
                key={`${row.pipeline}-${row.status}`}
              >
                <span><strong>{row.pipeline}</strong><StatusPill status={row.status} /></span>
                <span className="pipeline-count"><b>{row.count}</b><ChevronRight size={15} /></span>
              </Link>
            ))}
          </div>
        ) : <EmptyState title="No jobs yet" detail="Pipeline activity will appear here." />}
      </section>

      <section className="panel event-panel" id="event-ledger">
        <div className="panel-heading event-heading">
          <div>
            <h2>Operational event ledger</h2>
            <p>Append-only history of processing, errors, uploads, speech-to-text, quizzes and reports</p>
          </div>
          <div className="event-totals" aria-label="Event totals">
            <span><strong>{eventCounts.total}</strong> total</span>
            <span className="event-total-warning"><strong>{eventCounts.warnings}</strong> warnings</span>
            <span className="event-total-error"><strong>{eventCounts.errors}</strong> errors</span>
            <span><strong>{eventCounts.today}</strong> today</span>
          </div>
        </div>
        <nav className="event-filters" aria-label="Filter operational events">
          {filters.map((filter) => (
            <Link
              key={filter.value}
              href={queryHref(filter.value)}
              className={view === filter.value ? "active" : undefined}
            >
              {filter.label}
              {filter.value === "errors" && eventCounts.errors > 0 && <b>{eventCounts.errors}</b>}
            </Link>
          ))}
        </nav>

        {events.length ? (
          <div className="event-list">
            {events.map((event) => (
              <details className={`event-record ${event.level}`} key={event.id}>
                <summary>
                  <span className={`event-icon ${event.category}`}><EventIcon event={event} /></span>
                  <span className="event-copy">
                    <strong>{event.message}</strong>
                    <small>{event.event_type}</small>
                  </span>
                  <span className="event-user"><strong>{event.learner}</strong><small>{event.user_email || "System event"}</small></span>
                  <StatusPill status={event.outcome} />
                  <time>{formatDate(event.occurred_at, true)}</time>
                  <ChevronDown className="event-chevron" size={16} />
                </summary>
                <div className="event-details">
                  <dl>
                    <div><dt>Level</dt><dd className={`event-level ${event.level}`}>{event.level}</dd></div>
                    <div><dt>Category</dt><dd>{event.category}</dd></div>
                    <div><dt>Event type</dt><dd>{event.event_type}</dd></div>
                    <div><dt>Entity</dt><dd>{event.entity_type || "—"}</dd></div>
                    <div><dt>Entity ID</dt><dd className="mono">{event.entity_id || "—"}</dd></div>
                    <div><dt>Error code</dt><dd className={event.error_code ? "error-text mono" : undefined}>{event.error_code || "—"}</dd></div>
                    <div><dt>Occurred</dt><dd>{formatDate(event.occurred_at, true)}</dd></div>
                    <div><dt>Event ID</dt><dd className="mono">{event.id}</dd></div>
                  </dl>
                  <div className="event-metadata">
                    <span>Event metadata</span>
                    {event.category === "voice" && event.entity_id && (
                      <audio
                        aria-label="Voice note attached to this event"
                        controls
                        preload="none"
                        controlsList="nodownload"
                        src={`/api/admin/voice/${event.entity_id}`}
                      />
                    )}
                    <pre>{JSON.stringify(event.metadata, null, 2)}</pre>
                  </div>
                </div>
              </details>
            ))}
          </div>
        ) : (
          <EmptyState
            title={view === "errors" ? "No errors recorded" : "No matching events"}
            detail={view === "errors" ? "That is good news. Future failures will remain visible here." : "Try a different event filter."}
          />
        )}

        {totalPages > 1 && (
          <div className="event-pagination">
            {page > 1 ? <Link href={queryHref(view, page - 1)}><ChevronLeft size={15} /> Newer</Link> : <span />}
            <small>Page {page} of {totalPages} · {eventPagination.total} events</small>
            {page < totalPages ? <Link href={queryHref(view, page + 1)}>Older <ChevronRight size={15} /></Link> : <span />}
          </div>
        )}
      </section>

      <div className="split-panels operations-split">
        <section className="panel table-panel">
          <div className="panel-heading table-heading"><div><h2>Latest weekly voice notes</h2><p>Most recent 30 uploads and transcription states; full history is in the ledger</p></div></div>
          {voiceNotes.length ? (
            <div className="table-wrap"><table>
              <thead><tr><th>Learner</th><th>Week</th><th>Voice note</th><th>Status</th><th>Uploaded</th></tr></thead>
              <tbody>{voiceNotes.map((note) => <tr key={note.id}>
                <td><strong>{note.learner}</strong><small className="table-subline">{note.kind === "plan" ? "Monday intention" : "Sunday reflection"}</small>{note.error_code && <small className="table-subline error-text">{note.error_code}</small>}</td>
                <td>{note.week_start}</td>
                <td className="audio-cell">
                  <audio aria-label={`${note.learner} ${note.kind} voice note`} controls preload="none" controlsList="nodownload" src={`/api/admin/voice/${note.id}`} />
                  <small>{formatBytes(note.size_bytes)}{note.transcript ? ` · “${note.transcript.slice(0, 72)}${note.transcript.length > 72 ? "…" : ""}”` : ""}</small>
                </td>
                <td><StatusPill status={note.status} /></td><td>{formatDate(note.uploaded_at, true)}</td>
              </tr>)}</tbody>
            </table></div>
          ) : <EmptyState title="No voice notes yet" detail="Weekly voice-note processing will appear here." />}
        </section>

        <section className="panel table-panel">
          <div className="panel-heading table-heading"><div><h2>Latest weekly reports</h2><p>Most recent 30 learner summaries; full history is in the ledger</p></div></div>
          {reports.length ? (
            <div className="table-wrap"><table>
              <thead><tr><th>Learner</th><th>Week</th><th>Study</th><th>Days</th><th>Generated</th></tr></thead>
              <tbody>{reports.map((report) => <tr key={report.id}>
                <td><strong>{report.learner}</strong>{report.summary && <small className="table-subline summary-line">{report.summary}</small>}</td>
                <td>{report.week_start}</td><td>{report.total_minutes}m · {report.session_count} sessions</td><td>{report.qualified_days}/{report.active_days}</td><td>{formatDate(report.generated_at, true)}<small className="table-subline">{report.downloaded_at ? "Downloaded" : "Not downloaded"}</small></td>
              </tr>)}</tbody>
            </table></div>
          ) : <EmptyState title="No weekly reports yet" detail="Generated weekly summaries will appear here." />}
        </section>
      </div>
    </main>
  );
}
