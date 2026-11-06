-- Article management: allow creation/deletion and updates only to editable metadata/audit columns.
GRANT INSERT, DELETE ON ijcsitr.article TO 'ijcsitr_app'@'127.0.0.1';
GRANT UPDATE (article_title,article_key,abstract,keywords,reference,copyright,doi,google_scholar,corresponding_author,author_ids,date_of_publication,date_of_received,date_of_acceptance,page_from,page_to,status,article_file,year,volume,issue,month_from,month_to,updated_date,updated_userid,updated_usertype) ON ijcsitr.article TO 'ijcsitr_app'@'127.0.0.1';
