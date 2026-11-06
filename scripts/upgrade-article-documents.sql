-- Additive schema change. Existing article links and files remain intact.
ALTER TABLE ijcsitr.article
  ADD COLUMN article_pdf_storage VARCHAR(255) NULL,
  ADD COLUMN article_word_file VARCHAR(255) NULL;
GRANT UPDATE (article_pdf_storage, article_word_file)
  ON ijcsitr.article TO 'ijcsitr_app'@'127.0.0.1';
