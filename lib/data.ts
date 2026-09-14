import "server-only";

import { requireAdmin } from "@/lib/admin";
import { sql } from "@/lib/db";

export type OverviewStats = {
  users: number;
  new_users_7d: number;
  sessions: number;
  sessions_7d: number;
  study_minutes: number;
  topics: number;
  quizzes: number;
  average_score: number | null;
  reports: number;
  voice_notes: number;
};

export type TrendPoint = {
  day: string;
  sessions: number;
  topics: number;
  quizzes: number;
};

export type ActivityItem = {
  id: string;
  kind: "session" | "topic" | "quiz" | "voice";
  title: string;
  subtitle: string;
  status: string | null;
  occurred_at: string;
};

export type SubjectRow = {
  subject: string;
  count: number;
};

export async function getOverviewData() {
  await requireAdmin();
  const [statsRows, trendRows, activityRows, subjectRows] = await Promise.all([
    sql`
      select
        (select count(*)::int from app_users) as users,
        (select count(*)::int from app_users where created_at >= now() - interval '7 days') as new_users_7d,
        (select count(*)::int from study_sessions) as sessions,
        (select count(*)::int from study_sessions where submitted_at >= now() - interval '7 days') as sessions_7d,
        (select coalesce(sum(duration), 0)::int from study_sessions) as study_minutes,
        (select count(*)::int from topic_sets) as topics,
        (select count(*)::int from quiz_attempts) as quizzes,
        (select round(avg(score)::numeric, 1)::float8 from quiz_attempts) as average_score,
        (select count(*)::int from weekly_reports) as reports,
        (select count(*)::int from weekly_voice_notes) as voice_notes
    `,
    sql`
      with days as (
        select generate_series(current_date - interval '6 days', current_date, interval '1 day')::date as day
      )
      select
        to_char(days.day, 'YYYY-MM-DD') as day,
        (select count(*)::int from study_sessions s where s.submitted_at::date = days.day) as sessions,
        (select count(*)::int from topic_sets t where t.created_at::date = days.day) as topics,
        (select count(*)::int from quiz_attempts q where q.submitted_at::date = days.day) as quizzes
      from days order by days.day
    `,
    sql`
      select * from (
        select s.id::text, 'session'::text as kind,
          coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'Unknown learner') as title,
          left(regexp_replace(s.content, E'[\\n\\r]+', ' ', 'g'), 92) as subtitle,
          s.status, s.submitted_at as occurred_at
        from study_sessions s left join app_users u on u.id = s.user_id
        union all
        select t.id::text, 'topic'::text,
          coalesce(nullif(t.topic, ''), 'Untitled topic'),
          coalesce(nullif(t.subject, ''), 'General') as subtitle,
          t.status, t.created_at
        from topic_sets t
        union all
        select q.id::text, 'quiz'::text,
          coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'Unknown learner'),
          concat('Quiz score: ', coalesce(q.score::text, '—')),
          'submitted'::text, q.submitted_at
        from quiz_attempts q left join app_users u on u.id = q.user_id
        union all
        select v.id::text, 'voice'::text,
          coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'Unknown learner'),
          concat(initcap(coalesce(v.kind, 'voice')), ' voice note'),
          v.status, v.uploaded_at
        from weekly_voice_notes v left join app_users u on u.id = v.user_id
      ) activity
      order by occurred_at desc nulls last limit 8
    `,
    sql`
      select coalesce(nullif(subject, ''), 'General') as subject, count(*)::int as count
      from topic_sets group by 1 order by count desc, subject asc limit 6
    `,
  ]);

  return {
    stats: (statsRows as unknown as OverviewStats[])[0],
    trends: trendRows as unknown as TrendPoint[],
    activity: activityRows as unknown as ActivityItem[],
    subjects: subjectRows as unknown as SubjectRow[],
  };
}

export type UserRow = {
  id: string;
  handle: string | null;
  display_name: string | null;
  email: string | null;
  auth_provider: string | null;
  created_at: string;
  sessions: number;
  topics: number;
  quizzes: number;
  last_active_at: string | null;
};

export async function getUsers() {
  await requireAdmin();
  const rows = await sql`
    select u.id::text, u.handle, u.display_name, u.email, u.auth_provider, u.created_at,
      (select count(*)::int from study_sessions s where s.user_id = u.id) as sessions,
      (select count(*)::int from topic_sets t where t.user_id = u.id) as topics,
      (select count(*)::int from quiz_attempts q where q.user_id = u.id) as quizzes,
      greatest(
        u.created_at,
        (select max(s.submitted_at) from study_sessions s where s.user_id = u.id),
        (select max(q.submitted_at) from quiz_attempts q where q.user_id = u.id)
      ) as last_active_at
    from app_users u order by last_active_at desc nulls last
  `;
  return rows as unknown as UserRow[];
}

export type StudySessionRow = {
  id: string;
  learner: string;
  content: string;
  duration: number;
  date: string;
  status: string;
  attempts: number;
  failures: number;
  error_code: string | null;
  submitted_at: string;
};

export type TopicRow = {
  id: string;
  learner: string;
  topic: string;
  subject: string | null;
  study_date: string;
  question_count: number;
  status: string;
  generator_model: string | null;
  created_at: string;
};

export type QuizRow = {
  id: string;
  learner: string;
  score: number | null;
  question_count: number;
  started_at: string | null;
  submitted_at: string;
};

export async function getLearningData() {
  await requireAdmin();
  const [sessions, topics, quizzes] = await Promise.all([
    sql`
      select s.id::text,
        coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'Unknown learner') as learner,
        s.content, s.duration, s.date, coalesce(s.status, 'unknown') as status,
        coalesce(s.attempts, 0)::int as attempts, coalesce(s.failures, 0)::int as failures,
        s.error_code, s.submitted_at
      from study_sessions s left join app_users u on u.id = s.user_id
      order by s.submitted_at desc nulls last limit 30
    `,
    sql`
      select t.id::text,
        coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'Unknown learner') as learner,
        t.topic, t.subject, t.study_date,
        case when jsonb_typeof(t.questions) = 'array' then jsonb_array_length(t.questions) else 0 end::int as question_count,
        coalesce(t.status, 'unknown') as status, t.generator_model, t.created_at
      from topic_sets t left join app_users u on u.id = t.user_id
      order by t.created_at desc nulls last limit 30
    `,
    sql`
      select q.id::text,
        coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'Unknown learner') as learner,
        q.score,
        case when jsonb_typeof(q.questions) = 'array' then jsonb_array_length(q.questions) else 0 end::int as question_count,
        q.started_at, q.submitted_at
      from quiz_attempts q left join app_users u on u.id = q.user_id
      order by q.submitted_at desc nulls last limit 30
    `,
  ]);

  return {
    sessions: sessions as unknown as StudySessionRow[],
    topics: topics as unknown as TopicRow[],
    quizzes: quizzes as unknown as QuizRow[],
  };
}

export type VoiceNoteRow = {
  id: string;
  learner: string;
  week_start: string;
  kind: string;
  size_bytes: number | null;
  status: string;
  attempts: number;
  error_code: string | null;
  transcript: string | null;
  uploaded_at: string;
};

export type ReportRow = {
  id: string;
  learner: string;
  week_start: string;
  generated_at: string;
  downloaded_at: string | null;
  total_minutes: number;
  active_days: number;
  qualified_days: number;
  session_count: number;
  summary: string | null;
};

export type PipelineRow = {
  pipeline: string;
  status: string;
  count: number;
};

export type OperationEvent = {
  id: string;
  occurred_at: string;
  level: "info" | "warn" | "error";
  category: string;
  event_type: string;
  outcome: string;
  learner: string;
  user_email: string | null;
  entity_type: string | null;
  entity_id: string | null;
  message: string;
  error_code: string | null;
  metadata: Record<string, unknown>;
};

export type EventCounts = {
  total: number;
  errors: number;
  warnings: number;
  successes: number;
  today: number;
};

export const operationViews = [
  "all",
  "healthy",
  "attention",
  "errors",
  "study",
  "topic",
  "quiz",
  "voice",
  "report",
  "user",
  "api",
  "client",
  "auth",
  "storage",
] as const;

export type OperationView = (typeof operationViews)[number];

export async function getOperationsData(view: OperationView = "all", page = 1) {
  await requireAdmin();
  const pageSize = 100;
  const safePage = Math.max(1, Math.floor(page));
  const offset = (safePage - 1) * pageSize;
  const [voiceNotes, reports, pipeline, recordCountRows, eventRows, eventCountRows, eventTotalRows] = await Promise.all([
    sql`
      select v.id::text,
        coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'Unknown learner') as learner,
        v.week_start, coalesce(v.kind, 'voice') as kind, v.size_bytes,
        coalesce(v.status, 'unknown') as status, coalesce(v.attempts, 0)::int as attempts,
        v.error_code, v.transcript, v.uploaded_at
      from weekly_voice_notes v left join app_users u on u.id = v.user_id
      order by v.uploaded_at desc nulls last limit 30
    `,
    sql`
      select r.id::text,
        coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'Unknown learner') as learner,
        r.week_start, r.generated_at, r.downloaded_at,
        coalesce(nullif(r.metrics->>'totalMinutes', '')::int, 0) as total_minutes,
        coalesce(nullif(r.metrics->>'activeDays', '')::int, 0) as active_days,
        coalesce(nullif(r.metrics->>'qualifiedDays', '')::int, 0) as qualified_days,
        coalesce(nullif(r.metrics->>'sessionCount', '')::int, 0) as session_count,
        nullif(r.metrics->>'summary', '') as summary
      from weekly_reports r left join app_users u on u.id = r.user_id
      order by r.generated_at desc nulls last limit 30
    `,
    sql`
      select 'Study processing'::text as pipeline, coalesce(status, 'unknown') as status, count(*)::int as count
      from study_sessions group by status
      union all
      select 'Topic generation', coalesce(status, 'unknown'), count(*)::int from topic_sets group by status
      union all
      select 'Voice processing', coalesce(status, 'unknown'), count(*)::int from weekly_voice_notes group by status
      order by pipeline, status
    `,
    sql`
      select
        (select count(*)::int from weekly_voice_notes) as voice_notes,
        (select count(*)::int from weekly_reports) as reports
    `,
    sql`
      select e.id::text, e.occurred_at, e.level, e.category, e.event_type,
        e.outcome, e.entity_type, e.entity_id, e.message, e.error_code, e.metadata,
        coalesce(nullif(u.display_name, ''), nullif(u.handle, ''), 'System') as learner,
        u.email as user_email
      from admin_event_log e
      left join app_users u on u.id = e.user_id
      where case ${view}
        when 'healthy' then e.level = 'info' and e.outcome = 'success' and e.category in ('study', 'topic', 'voice')
        when 'attention' then e.level in ('warn', 'error')
        when 'errors' then e.level = 'error'
        when 'study' then e.category = 'study'
        when 'topic' then e.category = 'topic'
        when 'quiz' then e.category = 'quiz'
        when 'voice' then e.category = 'voice'
        when 'report' then e.category = 'report'
        when 'user' then e.category = 'user'
        when 'api' then e.category = 'api'
        when 'client' then e.category = 'client'
        when 'auth' then e.category = 'auth'
        when 'storage' then e.category = 'storage'
        else true
      end
      order by e.occurred_at desc, e.id desc
      limit ${pageSize} offset ${offset}
    `,
    sql`
      select
        count(*)::int as total,
        count(*) filter (where level = 'error')::int as errors,
        count(*) filter (where level = 'warn')::int as warnings,
        count(*) filter (where outcome = 'success' and level = 'info')::int as successes,
        count(*) filter (where occurred_at >= current_date)::int as today
      from admin_event_log
    `,
    sql`
      select count(*)::int as total
      from admin_event_log e
      where case ${view}
        when 'healthy' then e.level = 'info' and e.outcome = 'success' and e.category in ('study', 'topic', 'voice')
        when 'attention' then e.level in ('warn', 'error')
        when 'errors' then e.level = 'error'
        when 'study' then e.category = 'study'
        when 'topic' then e.category = 'topic'
        when 'quiz' then e.category = 'quiz'
        when 'voice' then e.category = 'voice'
        when 'report' then e.category = 'report'
        when 'user' then e.category = 'user'
        when 'api' then e.category = 'api'
        when 'client' then e.category = 'client'
        when 'auth' then e.category = 'auth'
        when 'storage' then e.category = 'storage'
        else true
      end
    `,
  ]);

  return {
    voiceNotes: voiceNotes as unknown as VoiceNoteRow[],
    reports: reports as unknown as ReportRow[],
    pipeline: pipeline as unknown as PipelineRow[],
    recordCounts: {
      voiceNotes: Number(recordCountRows[0]?.voice_notes ?? 0),
      reports: Number(recordCountRows[0]?.reports ?? 0),
    },
    events: eventRows as unknown as OperationEvent[],
    eventCounts: (eventCountRows as unknown as EventCounts[])[0],
    eventPagination: {
      page: safePage,
      pageSize,
      total: Number(eventTotalRows[0]?.total ?? 0),
    },
    storage: {
      tokenReady: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      storeReady: Boolean(process.env.BLOB_STORE_ID),
    },
  };
}
