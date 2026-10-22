-- Separate marginal totals, never rows for individual visits or joined dimensions.
CREATE TABLE traffic_counts (
  day TEXT NOT NULL,
  page TEXT NOT NULL CHECK (page IN ('/', '/direction-b.html', '/projects/surfay/', '/projects/urbot/', '/projects/cadeira/')),
  metric TEXT NOT NULL CHECK (metric IN ('requests', 'views', 'source', 'device', 'browser', 'viewport', 'country', 'scroll', 'visible', 'load')),
  bucket TEXT NOT NULL CHECK (length(bucket) BETWEEN 1 AND 24),
  count INTEGER NOT NULL CHECK (count BETWEEN 1 AND 5000),
  PRIMARY KEY (day, page, metric, bucket)
) WITHOUT ROWID;
