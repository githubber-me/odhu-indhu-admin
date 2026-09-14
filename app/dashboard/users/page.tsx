import { Search } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { getUsers } from "@/lib/data";
import { formatDate, initials } from "@/lib/format";

export const metadata = { title: "Learners" };
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const users = await getUsers();
  const activeUsers = users.filter((user) => user.sessions > 0 || user.quizzes > 0).length;

  return (
    <main>
      <div className="page-heading compact-heading">
        <div><p className="eyebrow">People</p><h1>Learners</h1><p>Everyone who has joined Odhu Indhu and their learning footprint.</p></div>
      </div>

      <div className="summary-strip">
        <div><strong>{users.length}</strong><span>Total learners</span></div>
        <div><strong>{activeUsers}</strong><span>With activity</span></div>
        <div><strong>{users.reduce((sum, user) => sum + user.sessions, 0)}</strong><span>Study sessions</span></div>
      </div>

      <section className="panel table-panel">
        <div className="panel-heading table-heading">
          <div><h2>Learner directory</h2><p>Profiles and recent engagement</p></div>
          <label className="small-search"><Search size={16} /><input placeholder="Search learners" disabled /></label>
        </div>
        {users.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Learner</th><th>Joined</th><th>Sessions</th><th>Topics</th><th>Quizzes</th><th>Last active</th></tr></thead>
              <tbody>
                {users.map((user) => {
                  const name = user.display_name || user.handle || "Unnamed learner";
                  return (
                    <tr key={user.id}>
                      <td><div className="person-cell"><span>{initials(name) || "U"}</span><div><strong>{name}</strong><small>{user.email || `@${user.handle || "no-handle"}`}</small></div></div></td>
                      <td>{formatDate(user.created_at)}</td>
                      <td><b>{user.sessions}</b></td>
                      <td>{user.topics}</td>
                      <td>{user.quizzes}</td>
                      <td>{formatDate(user.last_active_at, true)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="No learners yet" detail="New learners will appear after their first sign-in." />}
      </section>
    </main>
  );
}
