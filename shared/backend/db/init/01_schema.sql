SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'USER',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS visits (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    hospital_name VARCHAR(255) NOT NULL,
    department_name VARCHAR(100),
    visited_at DATE NOT NULL,
    visit_reason TEXT,
    treatment_status VARCHAR(50) NOT NULL DEFAULT 'REGISTERED',
    medication_start_date DATE,
    medication_end_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_visits_user_date (user_id, visited_at),
    CONSTRAINT fk_visits_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS prescriptions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    visit_id BIGINT NOT NULL,
    image_url VARCHAR(500),
    raw_ocr_text TEXT,
    analysis_status VARCHAR(50) NOT NULL DEFAULT 'UPLOADED',
    analyzed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_prescriptions_visit_id (visit_id),
    CONSTRAINT fk_prescriptions_visit
        FOREIGN KEY (visit_id) REFERENCES visits (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS health_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    visit_id BIGINT NOT NULL,
    recorded_at TIMESTAMP NOT NULL,
    symptom_name VARCHAR(255),
    symptom_severity INT,
    side_effects TEXT,
    body_temperature DECIMAL(4,1),
    sleep_hours DECIMAL(4,1),
    water_intake_ml INT,
    activity_minutes INT,
    memo TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_health_logs_visit_date (visit_id, recorded_at),
    CONSTRAINT fk_health_logs_visit
        FOREIGN KEY (visit_id) REFERENCES visits (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    visit_id BIGINT NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    sources TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_chat_messages_visit_date (visit_id, created_at),
    CONSTRAINT fk_chat_messages_visit
        FOREIGN KEY (visit_id) REFERENCES visits (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reports (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    visit_id BIGINT NOT NULL,
    summary TEXT,
    symptom_changes TEXT,
    suspected_side_effects TEXT,
    lifestyle_summary TEXT,
    adherence_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    doctor_notes TEXT,
    generated_at TIMESTAMP NOT NULL,
    KEY idx_reports_visit_date (visit_id, generated_at),
    CONSTRAINT fk_reports_visit
        FOREIGN KEY (visit_id) REFERENCES visits (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS treatment_comparisons (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    current_visit_id BIGINT NOT NULL,
    past_visit_id BIGINT NOT NULL,
    common_points TEXT,
    differences TEXT,
    summary TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_treatment_comparisons_current_date (current_visit_id, created_at),
    CONSTRAINT fk_treatment_comparisons_current_visit
        FOREIGN KEY (current_visit_id) REFERENCES visits (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_treatment_comparisons_past_visit
        FOREIGN KEY (past_visit_id) REFERENCES visits (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS medications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    prescription_id BIGINT NOT NULL,
    medication_name VARCHAR(255) NOT NULL,
    item_seq VARCHAR(20),
    dosage DECIMAL(10,2),
    dose_unit VARCHAR(20),
    frequency_per_day INT,
    duration_days INT,
    instructions VARCHAR(500),
    purpose TEXT,
    side_effect_summary TEXT,
    ocr_confidence DOUBLE,
    ocr_unmatched BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_medications_prescription_id (prescription_id),
    CONSTRAINT fk_medications_prescription
        FOREIGN KEY (prescription_id) REFERENCES prescriptions (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS medication_doses (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    medication_id BIGINT NOT NULL,
    scheduled_at TIMESTAMP NOT NULL,
    dose_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    taken_at TIMESTAMP NULL,
    reminder_sent_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_medication_doses_medication_schedule (medication_id, scheduled_at),
    CONSTRAINT fk_medication_doses_medication
        FOREIGN KEY (medication_id) REFERENCES medications (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS push_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_push_tokens_token (token),
    KEY idx_push_tokens_user_id (user_id),
    CONSTRAINT fk_push_tokens_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_refresh_tokens_hash (token_hash),
    KEY idx_refresh_tokens_user_id (user_id),
    CONSTRAINT fk_refresh_tokens_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS prescription_corrections (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    prescription_id BIGINT NOT NULL,
    ocr_text VARCHAR(500) NOT NULL,
    corrected_name VARCHAR(255) NOT NULL,
    item_seq VARCHAR(20),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_prescription_corrections_prescription_id (prescription_id),
    CONSTRAINT fk_prescription_corrections_prescription
        FOREIGN KEY (prescription_id) REFERENCES prescriptions (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS medication_interactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    medication_a_id BIGINT NOT NULL,
    medication_b_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(30) NOT NULL,
    reason TEXT,
    source VARCHAR(255) NOT NULL,
    checked_at TIMESTAMP NOT NULL,
    KEY idx_medication_interactions_user_id (user_id),
    CONSTRAINT fk_interactions_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_interactions_medication_a
        FOREIGN KEY (medication_a_id) REFERENCES medications (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_interactions_medication_b
        FOREIGN KEY (medication_b_id) REFERENCES medications (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS knowledge_entries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    item_seq VARCHAR(20) NOT NULL,
    medication_name VARCHAR(255) NOT NULL,
    purpose TEXT,
    side_effects TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_knowledge_entries_item_seq (item_seq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
