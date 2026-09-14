import { CheckCircle2, FileText, Headphones, Workflow } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { StatusPill } from "@/components/status-pill";
import { getOperationsData } from "@/lib/data";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Operations" };
export const dynamic = "force-dynamic";

function formatBytes(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function OperationsPage() {
  const { voiceNotes, reports, pipeline, storage } = await getOperationsData();
  const healthy = pipeline.reduce((sum, row) => sum + (["ready", "complete", "completed", "success"].includes(row.status) ? row.count : 0), 0);
  const attention = pipeline.reduce((sum, row) => sum + (["failed", "error", "partial"].includes(row.status) ? row.count : 0), 0);

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

      <div className="summary-strip four-up">
        <div><span className="summary-icon green"><CheckCircle2 size={17} /></span><strong>{healthy}</strong><span>Healthy jobs</span></div>
        <div><span className="summary-icon amber"><Workflow size={17} /></span><strong>{attention}</strong><span>Need attention</span></div>
        <div><span className="summary-icon blue"><Headphones size={17} /></span><strong>{voiceNotes.length}</strong><span>Voice notes</span></div>
        <div><span className="summary-icon violet"><FileText size={17} /></span><strong>{reports.length}</strong><span>Weekly reports</span></div>
      </div>

      <section className="panel pipeline-panel">
        <div className="panel-heading"><div><h2>Pipeline health</h2><p>Current status across asynchronous workflows</p></div></div>
        {pipeline.length ? (
          <div className="pipeline-grid">
            {pipeline.map((row) => (
              <div className="pipeline-item" key={`${row.pipeline}-${row.status}`}>
                <span><strong>{row.pipeline}</strong><StatusPill status={row.status} /></span>
                <b>{row.count}</b>
              </div>
            ))}
          </div>
        ) : <EmptyState title="No jobs yet" detail="Pipeline activity will appear here." />}
      </section>

      <div className="split-panels operations-split">
        <section className="panel table-panel">
          <div className="panel-heading table-heading"><div><h2>Weekly voice notes</h2><p>Uploads and transcription status</p></div></div>
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
          <div className="panel-heading table-heading"><div><h2>Weekly reports</h2><p>Generated learner summaries</p></div></div>
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
