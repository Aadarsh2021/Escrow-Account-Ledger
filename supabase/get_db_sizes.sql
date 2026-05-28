-- ============================================================
-- SQL HELPER: Create RPC function to check database sizes
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_db_sizes()
RETURNS json
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(t), '[]'::json)
    FROM (
      SELECT
        nspname AS schema_name,
        relname AS object_name,
        CASE c.relkind
          WHEN 'r' THEN 'Table'
          WHEN 'i' THEN 'Index'
          WHEN 't' THEN 'TOAST table'
          WHEN 'v' THEN 'View'
          WHEN 'm' THEN 'Materialized view'
          WHEN 'c' THEN 'Composite type'
          WHEN 'f' THEN 'Foreign table'
          WHEN 'p' THEN 'Partitioned table'
          WHEN 'I' THEN 'Partitioned index'
          ELSE 'Other'
        END AS object_type,
        pg_total_relation_size(c.oid) AS total_size_bytes,
        pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
        pg_size_pretty(pg_relation_size(c.oid)) AS data_size,
        pg_size_pretty(pg_total_relation_size(c.oid) - pg_relation_size(c.oid)) AS index_size
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE nspname NOT IN ('pg_catalog', 'information_schema')
        AND c.relkind IN ('r', 'i', 't', 'p')
      ORDER BY pg_total_relation_size(c.oid) DESC
      LIMIT 50
    ) t
  );
END;
$$ LANGUAGE plpgsql;
