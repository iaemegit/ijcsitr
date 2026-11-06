-- Enables saving existing articles through the admin article form.
-- Includes the PDF path and form metadata; does not grant INSERT or DELETE.
GRANT UPDATE (
  article_title, article_key, abstract, keywords, reference, copyright,
  doi, google_scholar, corresponding_author, author_ids,
  date_of_publication, date_of_received, date_of_acceptance,
  page_from, page_to, status, article_file,
  year, volume, issue, month_from, month_to,
  updated_date, updated_userid, updated_usertype
) ON ijcsitr.article TO 'ijcsitr_app'@'127.0.0.1';
