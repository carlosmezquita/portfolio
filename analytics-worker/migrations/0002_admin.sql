CREATE TABLE contact_requests (
  id TEXT PRIMARY KEY NOT NULL,
  received_at TEXT NOT NULL,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  email TEXT NOT NULL CHECK (length(email) BETWEEN 1 AND 254),
  message TEXT NOT NULL CHECK (length(message) BETWEEN 1 AND 5000),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived'))
);
CREATE INDEX contact_requests_status_date ON contact_requests(status, received_at DESC);
CREATE INDEX contact_requests_date ON contact_requests(received_at DESC);
CREATE TABLE site_content (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  document TEXT NOT NULL CHECK (json_valid(document) AND length(document) <= 6000),
  revision TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
