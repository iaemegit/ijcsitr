-- Adds only missing content tables; existing records are preserved.
CREATE TABLE IF NOT EXISTS ijcsitr.downloads (
 id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 title VARCHAR(255) NOT NULL,
 description TEXT NULL,
 file_url VARCHAR(2000) NOT NULL,
 status SMALLINT NOT NULL DEFAULT 1,
 created_date DATETIME(6) NOT NULL,
 created_userid INT NULL,
 updated_date DATETIME(6) NULL,
 updated_userid INT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE TABLE IF NOT EXISTS ijcsitr.testimonial (
 id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(255) NOT NULL,
 affiliation VARCHAR(255) NULL,
 designation VARCHAR(255) NULL,
 email VARCHAR(255) NULL,
 message TEXT NOT NULL,
 photo_url VARCHAR(2000) NULL,
 status SMALLINT NOT NULL DEFAULT 0,
 created_date DATETIME(6) NOT NULL,
 created_userid INT NULL,
 updated_date DATETIME(6) NULL,
 updated_userid INT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
