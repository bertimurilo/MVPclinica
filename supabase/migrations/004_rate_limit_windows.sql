CREATE TABLE rate_limit_windows (
  identifier   TEXT        NOT NULL,
  namespace    TEXT        NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count        INTEGER     NOT NULL DEFAULT 0,
  PRIMARY KEY (identifier, namespace, window_start)
);

CREATE INDEX idx_rate_limit_window_start ON rate_limit_windows (window_start);

CREATE OR REPLACE FUNCTION rate_limit_increment(
  p_identifier   TEXT,
  p_namespace    TEXT,
  p_window_start TIMESTAMPTZ
) RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO rate_limit_windows (identifier, namespace, window_start, count)
  VALUES (p_identifier, p_namespace, p_window_start, 1)
  ON CONFLICT (identifier, namespace, window_start)
  DO UPDATE SET count = rate_limit_windows.count + 1
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$$;

ALTER TABLE rate_limit_windows ENABLE ROW LEVEL SECURITY;
