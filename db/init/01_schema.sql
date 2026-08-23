SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------
-- USERS
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(255)  NOT NULL,
    password_hash VARCHAR(255)  NOT NULL,
    nickname      VARCHAR(100)  NOT NULL,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------
-- VISITS (users 1 --- N visits)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS visits (
    id                     BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id                BIGINT UNSIGNED NOT NULL,
    hospital_name          VARCHAR(255) NOT NULL,
    department_name        VARCHAR(100),
    visited_at             DATE         NOT NULL,
    visit_reason           TEXT,
    treatment_status       VARCHAR(50),
    medication_start_date  DATE,
    medication_end_date    DATE,
    created_at             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_visits_user_id (user_id),
    CONSTRAINT fk_visits_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------
-- PRESCRIPTIONS (visits 1 --- N prescriptions)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prescriptions (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    visit_id        BIGINT UNSIGNED NOT NULL,
    image_url       VARCHAR(500),
    raw_ocr_text    TEXT,
    analysis_status VARCHAR(50),
    analyzed_at     DATETIME,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_prescriptions_visit_id (visit_id),
    CONSTRAINT fk_prescriptions_visit
        FOREIGN KEY (visit_id) REFERENCES visits (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------
-- HEALTH_LOGS (visits 1 --- N health_logs)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS health_logs (
    id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    visit_id           BIGINT UNSIGNED NOT NULL,
    recorded_at        DATETIME     NOT NULL,
    symptom_name       VARCHAR(255),
    symptom_severity   INT,
    side_effects       TEXT,
    body_temperature   DECIMAL(4,1),
    sleep_hours        DECIMAL(4,1),
    water_intake_ml    INT,
    activity_minutes   INT,
    memo               TEXT,
    created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_health_logs_visit_id (visit_id),
    CONSTRAINT fk_health_logs_visit
        FOREIGN KEY (visit_id) REFERENCES visits (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------
-- CHAT_MESSAGES (visits 1 --- N chat_messages)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    visit_id   BIGINT UNSIGNED NOT NULL,
    role       VARCHAR(20)  NOT NULL,
    content    TEXT         NOT NULL,
    sources    TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_chat_messages_visit_id (visit_id),
    CONSTRAINT fk_chat_messages_visit
        FOREIGN KEY (visit_id) REFERENCES visits (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------
-- REPORTS (visits 1 --- N reports)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
    id                     BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    visit_id               BIGINT UNSIGNED NOT NULL,
    summary                TEXT,
    symptom_changes        TEXT,
    suspected_side_effects TEXT,
    lifestyle_summary      TEXT,
    doctor_notes           TEXT,
    generated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_reports_visit_id (visit_id),
    CONSTRAINT fk_reports_visit
        FOREIGN KEY (visit_id) REFERENCES visits (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------
-- MEDICATIONS (prescriptions 1 --- N medications)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medications (
    id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    prescription_id      BIGINT UNSIGNED NOT NULL,
    medication_name      VARCHAR(255) NOT NULL,
    dosage               DECIMAL(10,2),
    dose_unit            VARCHAR(20),
    frequency_per_day    INT,
    duration_days        INT,
    instructions         VARCHAR(500),
    purpose              TEXT,
    side_effect_summary  TEXT,
    created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_medications_prescription_id (prescription_id),
    CONSTRAINT fk_medications_prescription
        FOREIGN KEY (prescription_id) REFERENCES prescriptions (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------
-- MEDICATION_DOSES (medications 1 --- N medication_doses)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medication_doses (
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    medication_id  BIGINT UNSIGNED NOT NULL,
    scheduled_at   DATETIME NOT NULL,
    dose_status    VARCHAR(20),
    taken_at       DATETIME,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_medication_doses_medication_id (medication_id),
    CONSTRAINT fk_medication_doses_medication
        FOREIGN KEY (medication_id) REFERENCES medications (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
