CREATE TABLE IF NOT EXISTS admin_event_log (
  id bigserial PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  level text NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  category text NOT NULL,
  event_type text NOT NULL,
  outcome text NOT NULL,
  user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  entity_type text,
  entity_id text,
  message text NOT NULL,
  error_code text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  event_key text UNIQUE
);

CREATE INDEX IF NOT EXISTS admin_event_log_occurred_at_idx
  ON admin_event_log(occurred_at DESC);
CREATE INDEX IF NOT EXISTS admin_event_log_level_idx
  ON admin_event_log(level, occurred_at DESC);
CREATE INDEX IF NOT EXISTS admin_event_log_category_idx
  ON admin_event_log(category, occurred_at DESC);
CREATE INDEX IF NOT EXISTS admin_event_log_user_idx
  ON admin_event_log(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS admin_event_log_entity_idx
  ON admin_event_log(entity_type, entity_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION admin_log_study_session()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  row_value study_sessions;
  event_level text;
  event_outcome text;
BEGIN
  row_value := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO admin_event_log(
      occurred_at, level, category, event_type, outcome, user_id,
      entity_type, entity_id, message, metadata
    ) VALUES (
      row_value.submitted_at, 'info', 'study', 'study.session.submitted', 'created',
      row_value.user_id, 'study_session', row_value.id::text,
      'Study session submitted',
      jsonb_build_object(
        'date', row_value.date,
        'durationMinutes', row_value.duration,
        'contentLength', length(row_value.content),
        'status', row_value.status
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO admin_event_log(
      level, category, event_type, outcome, user_id,
      entity_type, entity_id, message, metadata
    ) VALUES (
      'warn', 'study', 'study.session.deleted', 'deleted', row_value.user_id,
      'study_session', row_value.id::text, 'Study session deleted',
      jsonb_build_object('date', row_value.date, 'durationMinutes', row_value.duration)
    );
    RETURN OLD;
  ELSE
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      event_level := CASE
        WHEN NEW.status = 'failed' THEN 'error'
        WHEN NEW.status = 'partial' THEN 'warn'
        ELSE 'info'
      END;
      event_outcome := CASE
        WHEN NEW.status = 'ready' THEN 'success'
        WHEN NEW.status = 'failed' THEN 'error'
        ELSE NEW.status
      END;
      INSERT INTO admin_event_log(
        level, category, event_type, outcome, user_id,
        entity_type, entity_id, message, error_code, metadata
      ) VALUES (
        event_level, 'study', 'study.processing.' || NEW.status, event_outcome,
        NEW.user_id, 'study_session', NEW.id::text,
        CASE NEW.status
          WHEN 'ready' THEN 'Study processing completed'
          WHEN 'processing' THEN 'Study processing started'
          WHEN 'partial' THEN 'Study processing completed partially'
          WHEN 'failed' THEN 'Study processing failed'
          WHEN 'queued' THEN 'Study processing queued'
          ELSE 'Study status changed to ' || NEW.status
        END,
        NEW.error_code,
        jsonb_build_object(
          'fromStatus', OLD.status,
          'toStatus', NEW.status,
          'attempts', NEW.attempts,
          'failures', NEW.failures,
          'date', NEW.date,
          'durationMinutes', NEW.duration
        )
      );
    END IF;

    IF NEW.error_code IS DISTINCT FROM OLD.error_code AND NEW.error_code IS NOT NULL THEN
      INSERT INTO admin_event_log(
        level, category, event_type, outcome, user_id,
        entity_type, entity_id, message, error_code, metadata
      ) VALUES (
        'error', 'study', 'study.processing.error', 'error', NEW.user_id,
        'study_session', NEW.id::text, 'Study processing reported an error',
        NEW.error_code,
        jsonb_build_object('status', NEW.status, 'attempts', NEW.attempts, 'failures', NEW.failures)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_observe_study_sessions ON study_sessions;
CREATE TRIGGER admin_observe_study_sessions
AFTER INSERT OR UPDATE OR DELETE ON study_sessions
FOR EACH ROW EXECUTE FUNCTION admin_log_study_session();

CREATE OR REPLACE FUNCTION admin_log_topic_set()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  row_value topic_sets;
  event_level text;
  event_outcome text;
BEGIN
  row_value := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO admin_event_log(
      level, category, event_type, outcome, user_id,
      entity_type, entity_id, message, metadata
    ) VALUES (
      'warn', 'topic', 'topic.set.deleted', 'deleted', row_value.user_id,
      'topic_set', row_value.id::text, 'Generated topic set deleted',
      jsonb_build_object('topic', row_value.topic, 'subject', row_value.subject)
    );
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    event_level := CASE WHEN NEW.status = 'partial' THEN 'warn' WHEN NEW.status = 'failed' THEN 'error' ELSE 'info' END;
    event_outcome := CASE WHEN NEW.status = 'ready' THEN 'success' WHEN NEW.status = 'failed' THEN 'error' ELSE NEW.status END;
    INSERT INTO admin_event_log(
      occurred_at, level, category, event_type, outcome, user_id,
      entity_type, entity_id, message, error_code, metadata
    ) VALUES (
      NEW.created_at, event_level, 'topic', 'topic.set.created', event_outcome,
      NEW.user_id, 'topic_set', NEW.id::text, 'Topic set created', NULL,
      jsonb_build_object(
        'topic', NEW.topic,
        'subject', NEW.subject,
        'status', NEW.status,
        'questions', jsonb_array_length(NEW.questions),
        'evidenceSources', jsonb_array_length(NEW.evidence),
        'availableOn', NEW.available_on
      )
    );
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    event_level := CASE WHEN NEW.status = 'partial' THEN 'warn' WHEN NEW.status = 'failed' THEN 'error' ELSE 'info' END;
    event_outcome := CASE WHEN NEW.status = 'ready' THEN 'success' WHEN NEW.status = 'failed' THEN 'error' ELSE NEW.status END;
    INSERT INTO admin_event_log(
      level, category, event_type, outcome, user_id,
      entity_type, entity_id, message, metadata
    ) VALUES (
      event_level, 'topic', 'topic.generation.' || NEW.status, event_outcome,
      NEW.user_id, 'topic_set', NEW.id::text,
      CASE WHEN NEW.status = 'ready' THEN 'Topic generation completed'
           WHEN NEW.status = 'partial' THEN 'Topic generation completed partially'
           WHEN NEW.status = 'failed' THEN 'Topic generation failed'
           ELSE 'Topic generation status changed to ' || NEW.status END,
      jsonb_build_object(
        'fromStatus', OLD.status,
        'toStatus', NEW.status,
        'topic', NEW.topic,
        'subject', NEW.subject,
        'questions', jsonb_array_length(NEW.questions),
        'evidenceSources', jsonb_array_length(NEW.evidence),
        'generatorModel', NEW.generator_model,
        'promptVersion', NEW.prompt_version,
        'dailyNews', NEW.subject = 'Current Affairs'
          AND NEW.topic LIKE 'News and current affairs for %'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_observe_topic_sets ON topic_sets;
CREATE TRIGGER admin_observe_topic_sets
AFTER INSERT OR UPDATE OR DELETE ON topic_sets
FOR EACH ROW EXECUTE FUNCTION admin_log_topic_set();

CREATE OR REPLACE FUNCTION admin_log_quiz_attempt()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  row_value quiz_attempts;
BEGIN
  row_value := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO admin_event_log(
      occurred_at, level, category, event_type, outcome, user_id,
      entity_type, entity_id, message, metadata
    ) VALUES (
      row_value.started_at, 'info', 'quiz', 'quiz.attempt.started', 'started',
      row_value.user_id, 'quiz_attempt', row_value.id::text, 'Quiz attempt started',
      jsonb_build_object('setId', row_value.set_id, 'questions', jsonb_array_length(row_value.questions))
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO admin_event_log(level, category, event_type, outcome, user_id, entity_type, entity_id, message)
    VALUES ('warn', 'quiz', 'quiz.attempt.deleted', 'deleted', row_value.user_id, 'quiz_attempt', row_value.id::text, 'Quiz attempt deleted');
    RETURN OLD;
  ELSIF NEW.submitted_at IS NOT NULL AND OLD.submitted_at IS NULL THEN
    INSERT INTO admin_event_log(
      occurred_at, level, category, event_type, outcome, user_id,
      entity_type, entity_id, message, metadata
    ) VALUES (
      NEW.submitted_at, 'info', 'quiz', 'quiz.attempt.submitted', 'success',
      NEW.user_id, 'quiz_attempt', NEW.id::text, 'Quiz attempt submitted',
      jsonb_build_object('setId', NEW.set_id, 'score', NEW.score, 'questions', jsonb_array_length(NEW.questions))
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_observe_quiz_attempts ON quiz_attempts;
CREATE TRIGGER admin_observe_quiz_attempts
AFTER INSERT OR UPDATE OR DELETE ON quiz_attempts
FOR EACH ROW EXECUTE FUNCTION admin_log_quiz_attempt();

CREATE OR REPLACE FUNCTION admin_log_voice_note()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  row_value weekly_voice_notes;
  event_level text;
  event_outcome text;
BEGIN
  row_value := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO admin_event_log(
      occurred_at, level, category, event_type, outcome, user_id,
      entity_type, entity_id, message, metadata
    ) VALUES (
      row_value.uploaded_at, 'info', 'voice', 'voice.upload.completed', 'success',
      row_value.user_id, 'voice_note', row_value.id::text,
      CASE WHEN row_value.kind = 'plan' THEN 'Monday intention uploaded' ELSE 'Sunday reflection uploaded' END,
      jsonb_build_object(
        'weekStart', row_value.week_start,
        'kind', row_value.kind,
        'contentType', row_value.content_type,
        'sizeBytes', row_value.size_bytes,
        'status', row_value.status
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO admin_event_log(level, category, event_type, outcome, user_id, entity_type, entity_id, message, metadata)
    VALUES (
      'warn', 'voice', 'voice.note.deleted', 'deleted', row_value.user_id,
      'voice_note', row_value.id::text, 'Weekly voice note deleted',
      jsonb_build_object('weekStart', row_value.week_start, 'kind', row_value.kind)
    );
    RETURN OLD;
  ELSE
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      event_level := CASE WHEN NEW.status = 'failed' THEN 'error' ELSE 'info' END;
      event_outcome := CASE WHEN NEW.status = 'ready' THEN 'success' WHEN NEW.status = 'failed' THEN 'error' ELSE NEW.status END;
      INSERT INTO admin_event_log(
        level, category, event_type, outcome, user_id,
        entity_type, entity_id, message, error_code, metadata
      ) VALUES (
        event_level, 'voice', 'voice.transcription.' || NEW.status, event_outcome,
        NEW.user_id, 'voice_note', NEW.id::text,
        CASE NEW.status
          WHEN 'transcribing' THEN 'Speech-to-text run started'
          WHEN 'ready' THEN 'Speech-to-text run completed'
          WHEN 'failed' THEN 'Speech-to-text run failed'
          WHEN 'queued' THEN 'Speech-to-text run queued'
          ELSE 'Voice processing status changed to ' || NEW.status
        END,
        NEW.error_code,
        jsonb_build_object(
          'fromStatus', OLD.status,
          'toStatus', NEW.status,
          'weekStart', NEW.week_start,
          'kind', NEW.kind,
          'attempts', NEW.attempts,
          'sarvamJobId', NEW.sarvam_job_id,
          'transcriptLength', coalesce(length(NEW.transcript), 0)
        )
      );
    END IF;

    IF NEW.error_code IS DISTINCT FROM OLD.error_code AND NEW.error_code IS NOT NULL THEN
      INSERT INTO admin_event_log(
        level, category, event_type, outcome, user_id,
        entity_type, entity_id, message, error_code, metadata
      ) VALUES (
        'error', 'voice', 'voice.transcription.error', 'error', NEW.user_id,
        'voice_note', NEW.id::text, 'Speech-to-text processing reported an error',
        NEW.error_code,
        jsonb_build_object('status', NEW.status, 'attempts', NEW.attempts, 'sarvamJobId', NEW.sarvam_job_id)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_observe_weekly_voice_notes ON weekly_voice_notes;
CREATE TRIGGER admin_observe_weekly_voice_notes
AFTER INSERT OR UPDATE OR DELETE ON weekly_voice_notes
FOR EACH ROW EXECUTE FUNCTION admin_log_voice_note();

CREATE OR REPLACE FUNCTION admin_log_weekly_report()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  row_value weekly_reports;
BEGIN
  row_value := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO admin_event_log(
      occurred_at, level, category, event_type, outcome, user_id,
      entity_type, entity_id, message, metadata
    ) VALUES (
      row_value.generated_at, 'info', 'report', 'weekly.report.generated', 'success',
      row_value.user_id, 'weekly_report', row_value.id::text, 'Weekly PDF report generated',
      jsonb_build_object(
        'weekStart', row_value.week_start,
        'totalMinutes', row_value.metrics->'totalMinutes',
        'activeDays', row_value.metrics->'activeDays',
        'sessionCount', row_value.metrics->'sessionCount'
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO admin_event_log(level, category, event_type, outcome, user_id, entity_type, entity_id, message, metadata)
    VALUES (
      'warn', 'report', 'weekly.report.deleted', 'deleted', row_value.user_id,
      'weekly_report', row_value.id::text, 'Weekly report deleted',
      jsonb_build_object('weekStart', row_value.week_start)
    );
    RETURN OLD;
  ELSIF NEW.downloaded_at IS NOT NULL AND OLD.downloaded_at IS NULL THEN
    INSERT INTO admin_event_log(
      occurred_at, level, category, event_type, outcome, user_id,
      entity_type, entity_id, message, metadata
    ) VALUES (
      NEW.downloaded_at, 'info', 'report', 'weekly.report.downloaded', 'success',
      NEW.user_id, 'weekly_report', NEW.id::text, 'Weekly PDF report downloaded',
      jsonb_build_object('weekStart', NEW.week_start)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_observe_weekly_reports ON weekly_reports;
CREATE TRIGGER admin_observe_weekly_reports
AFTER INSERT OR UPDATE OR DELETE ON weekly_reports
FOR EACH ROW EXECUTE FUNCTION admin_log_weekly_report();

CREATE OR REPLACE FUNCTION admin_log_user()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO admin_event_log(
      occurred_at, level, category, event_type, outcome, user_id,
      entity_type, entity_id, message, metadata
    ) VALUES (
      NEW.created_at, 'info', 'user', 'user.account.created', 'success', NEW.id,
      'app_user', NEW.id::text, 'Learner account created',
      jsonb_build_object('authProvider', NEW.auth_provider, 'handle', NEW.handle)
    );
    RETURN NEW;
  END IF;

  INSERT INTO admin_event_log(
    level, category, event_type, outcome, entity_type, entity_id, message, metadata
  ) VALUES (
    'warn', 'user', 'user.account.deleted', 'deleted', 'app_user', OLD.id::text,
    'Learner account deleted', jsonb_build_object('handle', OLD.handle)
  );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS admin_observe_app_users ON app_users;
CREATE TRIGGER admin_observe_app_users
AFTER INSERT OR DELETE ON app_users
FOR EACH ROW EXECUTE FUNCTION admin_log_user();

-- Seed the ledger with the latest known state of records created before the
-- audit triggers existed. Backfilled rows are clearly marked in metadata.
INSERT INTO admin_event_log(
  occurred_at, level, category, event_type, outcome, user_id,
  entity_type, entity_id, message, metadata, event_key
)
SELECT created_at, 'info', 'user', 'user.account.created', 'success', id,
  'app_user', id::text, 'Learner account created',
  jsonb_build_object('authProvider', auth_provider, 'handle', handle, 'backfilled', true),
  'backfill:user:' || id::text
FROM app_users
ON CONFLICT(event_key) DO NOTHING;

INSERT INTO admin_event_log(
  occurred_at, level, category, event_type, outcome, user_id,
  entity_type, entity_id, message, error_code, metadata, event_key
)
SELECT submitted_at,
  CASE WHEN status = 'failed' THEN 'error' WHEN status = 'partial' THEN 'warn' ELSE 'info' END,
  'study', 'study.processing.' || status,
  CASE WHEN status = 'ready' THEN 'success' WHEN status = 'failed' THEN 'error' ELSE status END,
  user_id, 'study_session', id::text,
  CASE WHEN status = 'ready' THEN 'Study processing completed'
       WHEN status = 'partial' THEN 'Study processing completed partially'
       WHEN status = 'failed' THEN 'Study processing failed'
       ELSE 'Study processing is ' || status END,
  error_code,
  jsonb_build_object(
    'date', date, 'durationMinutes', duration, 'attempts', attempts,
    'failures', failures, 'status', status, 'backfilled', true
  ),
  'backfill:study:' || id::text || ':' || status
FROM study_sessions
ON CONFLICT(event_key) DO NOTHING;

INSERT INTO admin_event_log(
  occurred_at, level, category, event_type, outcome, user_id,
  entity_type, entity_id, message, metadata, event_key
)
SELECT created_at,
  CASE WHEN status = 'failed' THEN 'error' WHEN status = 'partial' THEN 'warn' ELSE 'info' END,
  'topic', 'topic.generation.' || status,
  CASE WHEN status = 'ready' THEN 'success' WHEN status = 'failed' THEN 'error' ELSE status END,
  user_id, 'topic_set', id::text,
  CASE WHEN status = 'ready' THEN 'Topic generation completed'
       WHEN status = 'partial' THEN 'Topic generation completed partially'
       WHEN status = 'failed' THEN 'Topic generation failed'
       ELSE 'Topic generation is ' || status END,
  jsonb_build_object(
    'topic', topic, 'subject', subject, 'questions', jsonb_array_length(questions),
    'evidenceSources', jsonb_array_length(evidence), 'generatorModel', generator_model,
    'promptVersion', prompt_version, 'status', status, 'backfilled', true
  ),
  'backfill:topic:' || id::text || ':' || status
FROM topic_sets
ON CONFLICT(event_key) DO NOTHING;

INSERT INTO admin_event_log(
  occurred_at, level, category, event_type, outcome, user_id,
  entity_type, entity_id, message, metadata, event_key
)
SELECT started_at, 'info', 'quiz', 'quiz.attempt.started', 'started', user_id,
  'quiz_attempt', id::text, 'Quiz attempt started',
  jsonb_build_object('setId', set_id, 'questions', jsonb_array_length(questions), 'backfilled', true),
  'backfill:quiz:' || id::text || ':started'
FROM quiz_attempts
ON CONFLICT(event_key) DO NOTHING;

INSERT INTO admin_event_log(
  occurred_at, level, category, event_type, outcome, user_id,
  entity_type, entity_id, message, metadata, event_key
)
SELECT submitted_at, 'info', 'quiz', 'quiz.attempt.submitted', 'success', user_id,
  'quiz_attempt', id::text, 'Quiz attempt submitted',
  jsonb_build_object('setId', set_id, 'score', score, 'questions', jsonb_array_length(questions), 'backfilled', true),
  'backfill:quiz:' || id::text || ':submitted'
FROM quiz_attempts WHERE submitted_at IS NOT NULL
ON CONFLICT(event_key) DO NOTHING;

INSERT INTO admin_event_log(
  occurred_at, level, category, event_type, outcome, user_id,
  entity_type, entity_id, message, error_code, metadata, event_key
)
SELECT uploaded_at,
  CASE WHEN status = 'failed' THEN 'error' ELSE 'info' END,
  'voice', 'voice.transcription.' || status,
  CASE WHEN status = 'ready' THEN 'success' WHEN status = 'failed' THEN 'error' ELSE status END,
  user_id, 'voice_note', id::text,
  CASE WHEN status = 'ready' THEN 'Speech-to-text run completed'
       WHEN status = 'transcribing' THEN 'Speech-to-text run is active'
       WHEN status = 'failed' THEN 'Speech-to-text run failed'
       ELSE 'Speech-to-text run is ' || status END,
  error_code,
  jsonb_build_object(
    'weekStart', week_start, 'kind', kind, 'sizeBytes', size_bytes,
    'attempts', attempts, 'sarvamJobId', sarvam_job_id,
    'transcriptLength', coalesce(length(transcript), 0), 'status', status, 'backfilled', true
  ),
  'backfill:voice:' || id::text || ':' || status
FROM weekly_voice_notes
ON CONFLICT(event_key) DO NOTHING;

INSERT INTO admin_event_log(
  occurred_at, level, category, event_type, outcome, user_id,
  entity_type, entity_id, message, metadata, event_key
)
SELECT generated_at, 'info', 'report', 'weekly.report.generated', 'success', user_id,
  'weekly_report', id::text, 'Weekly PDF report generated',
  jsonb_build_object('weekStart', week_start, 'backfilled', true),
  'backfill:report:' || id::text || ':generated'
FROM weekly_reports
ON CONFLICT(event_key) DO NOTHING;
