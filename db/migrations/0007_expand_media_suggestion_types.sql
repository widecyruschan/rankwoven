BEGIN;

ALTER TABLE optimization_suggestions
  DROP CONSTRAINT IF EXISTS optimization_suggestions_suggestion_type_check;

ALTER TABLE optimization_suggestions
  ADD CONSTRAINT optimization_suggestions_suggestion_type_check CHECK (
    suggestion_type IN (
      'title',
      'meta_description',
      'content',
      'media_title',
      'media_caption',
      'media_description',
      'media_alt_text',
      'media_file_name',
      'internal_link'
    )
  );

COMMIT;
