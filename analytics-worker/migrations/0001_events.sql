CREATE TABLE event_counts (
  day TEXT NOT NULL,
  event TEXT NOT NULL CHECK (event IN ('cv_download', 'project_click', 'github_click', 'contact_start', 'contact_success')),
  target TEXT NOT NULL,
  page TEXT NOT NULL,
  count INTEGER NOT NULL CHECK (count BETWEEN 1 AND 5000),
  PRIMARY KEY (day, event, target, page)
) WITHOUT ROWID;

CREATE VIEW events_last_30_days AS
SELECT event, target, page, SUM(count) AS total
FROM event_counts WHERE day >= date('now', '-29 days')
GROUP BY event, target, page;

CREATE VIEW events_daily AS
SELECT day, event, SUM(count) AS total FROM event_counts GROUP BY day, event;
