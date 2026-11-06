-- Run once with the database owner using the existing migration login profile.
GRANT INSERT, UPDATE, DELETE ON ijcsitr.discipline TO 'ijcsitr_app'@'127.0.0.1';
GRANT INSERT, UPDATE, DELETE ON ijcsitr.affiliation TO 'ijcsitr_app'@'127.0.0.1';
GRANT INSERT, UPDATE, DELETE ON ijcsitr.journal_issue TO 'ijcsitr_app'@'127.0.0.1';
GRANT INSERT, UPDATE, DELETE ON ijcsitr.author TO 'ijcsitr_app'@'127.0.0.1';
GRANT UPDATE (user_password, user_updated_at) ON ijcsitr.users TO 'ijcsitr_app'@'127.0.0.1';
-- A single journal may have no discipline after confirmed deletion.
ALTER TABLE ijcsitr.journal MODIFY COLUMN discipline_id INTEGER NULL;
GRANT UPDATE (discipline_id, updated_date, updated_userid, updated_usertype) ON ijcsitr.journal TO 'ijcsitr_app'@'127.0.0.1';
GRANT UPDATE (journal_name,journal_key,abbrevation,coden,cover_page,discipline_id,doi,email,google_scholar,issn_online,issn_print,publication_frequency,start_month,start_year,status,sub_price,about_us,subject_area,updated_date,updated_userid,updated_usertype) ON ijcsitr.journal TO 'ijcsitr_app'@'127.0.0.1';
