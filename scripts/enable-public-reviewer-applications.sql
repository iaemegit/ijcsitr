-- Public Join form: only new applications; no update or deletion privileges.
GRANT INSERT (prefix,name,email_id,mobile_number,affiliation,qualifiaction,discipline,researcharea,country,state,city,message,resume_cv,status,created_date)
ON ijcsitr.joinus TO 'ijcsitr_app'@'127.0.0.1';
