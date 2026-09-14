import { BookOpenText, Clock3, Sparkles, Trophy } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { StatusPill } from "@/components/status-pill";
import { getLearningData } from "@/lib/data";
import { formatDate, formatDuration } from "@/lib/format";

export const metadata = { title: "Learning" };
export const dynamic = "force-dynamic";

export default async function LearningPage() {
  const { sessions, topics, quizzes } = await getLearningData();
  const readySessions = sessions.filter((session) => session.status === "ready").length;
  const totalDuration = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
  const questions = topics.reduce((sum, topic) => sum + topic.question_count, 0);

  return (
    <main>
      <div className="page-heading compact-heading">
        <div><p className="eyebrow">Learning loop</p><h1>Study activity</h1><p>From raw study notes to generated topics and completed quizzes.</p></div>
      </div>

      <div className="summary-strip four-up">
        <div><span className="summary-icon green"><BookOpenText size={17} /></span><strong>{sessions.length}</strong><span>Recent sessions</span></div>
        <div><span className="summary-icon amber"><Clock3 size={17} /></span><strong>{formatDuration(totalDuration)}</strong><span>Study time</span></div>
        <div><span className="summary-icon blue"><Sparkles size={17} /></span><strong>{questions}</strong><span>Questions generated</span></div>
        <div><span className="summary-icon violet"><Trophy size={17} /></span><strong>{quizzes.length}</strong><span>Quiz attempts</span></div>
      </div>

      <section className="panel table-panel">
        <div className="panel-heading table-heading">
          <div><h2>Study sessions</h2><p>{readySessions} ready · {sessions.length - readySessions} need attention</p></div>
        </div>
        {sessions.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Learner</th><th>Study note</th><th>Duration</th><th>Submitted</th><th>Status</th></tr></thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id}>
                    <td><strong>{session.learner}</strong></td>
                    <td className="content-cell"><span>{session.content}</span>{session.error_code && <small>{session.error_code}</small>}</td>
                    <td>{formatDuration(session.duration || 0)}</td>
                    <td>{formatDate(session.submitted_at, true)}</td>
                    <td><StatusPill status={session.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="No study sessions" detail="Submitted study notes will appear here." />}
      </section>

      <div className="split-panels">
        <section className="panel table-panel">
          <div className="panel-heading table-heading"><div><h2>Generated topics</h2><p>Latest question sets</p></div></div>
          {topics.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Topic</th><th>Learner</th><th>Questions</th><th>Status</th></tr></thead>
                <tbody>
                  {topics.map((topic) => (
                    <tr key={topic.id}>
                      <td><strong>{topic.topic}</strong><small className="table-subline">{topic.subject || "General"} · {formatDate(topic.created_at)}</small></td>
                      <td>{topic.learner}</td><td>{topic.question_count}</td><td><StatusPill status={topic.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState title="No generated topics" detail="Topic sets will appear after sessions are processed." />}
        </section>

        <section className="panel table-panel">
          <div className="panel-heading table-heading"><div><h2>Quiz attempts</h2><p>Most recent submissions</p></div></div>
          {quizzes.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Learner</th><th>Score</th><th>Questions</th><th>Submitted</th></tr></thead>
                <tbody>
                  {quizzes.map((quiz) => (
                    <tr key={quiz.id}><td><strong>{quiz.learner}</strong></td><td>{quiz.score ?? "—"}</td><td>{quiz.question_count}</td><td>{formatDate(quiz.submitted_at, true)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState title="No quiz attempts yet" detail="Completed quizzes will collect here." />}
        </section>
      </div>
    </main>
  );
}
