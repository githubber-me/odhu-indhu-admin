import { Inbox } from "lucide-react";

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty-state">
      <span><Inbox size={21} /></span>
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  );
}
