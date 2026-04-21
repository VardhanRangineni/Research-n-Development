-- Replace local stored_file_name with external image server metadata columns.
-- stored_file_name had a unique constraint (UKagfx399k6brhfvbiyc0h77urr);
-- MySQL drops single-column indexes automatically when the column is dropped.

ALTER TABLE project_documents
    ADD COLUMN image_path        VARCHAR(1000) NULL,
    ADD COLUMN thumbnail_path    VARCHAR(1000) NULL,
    ADD COLUMN original_image_name VARCHAR(500) NULL,
    DROP COLUMN stored_file_name;
