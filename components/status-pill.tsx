export function StatusPill({ status }: { status: string | null }) {
  const value = status?.toLowerCase() || "unknown";
  const tone = ["ready", "complete", "completed", "success", "submitted"].includes(value)
    ? "success"
    : ["failed", "error", "dead"].includes(value)
      ? "danger"
      : ["processing", "pending", "queued", "leased"].includes(value)
        ? "warning"
        : "neutral";

  return <span className={`status-pill ${tone}`}>{value.replaceAll("_", " ")}</span>;
}
