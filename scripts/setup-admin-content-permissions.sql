-- Apply only after explicit approval for management of these five sections.
GRANT UPDATE, DELETE ON ijcsitr.joinus TO 'ijcsitr_app'@'127.0.0.1';
GRANT UPDATE, DELETE ON ijcsitr.article_submission TO 'ijcsitr_app'@'127.0.0.1';
GRANT INSERT, UPDATE, DELETE ON ijcsitr.downloads TO 'ijcsitr_app'@'127.0.0.1';
GRANT INSERT, UPDATE, DELETE ON ijcsitr.testimonial TO 'ijcsitr_app'@'127.0.0.1';
GRANT UPDATE, DELETE ON ijcsitr.contactus TO 'ijcsitr_app'@'127.0.0.1';
