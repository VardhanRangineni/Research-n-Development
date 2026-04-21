-- Idempotent cleanup: drop stored_file_name if it still exists.
-- The associated unique index (UKagfx399k6brhfvbiyc0h77urr) is dropped automatically by MySQL.
-- IF EXISTS makes this safe to run regardless of the current schema state.
ALTER TABLE project_documents DROP COLUMN IF EXISTS stored_file_name;
