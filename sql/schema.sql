CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `nickname` VARCHAR(50) NULL,
  `avatar_url` VARCHAR(255) NULL,
  `mobile` VARCHAR(30) NULL,
  `email` VARCHAR(100) NULL,
  `login_type` VARCHAR(20) NOT NULL,
  `gender` VARCHAR(10) NULL,
  `birthday` DATE NULL,
  `timezone` VARCHAR(50) NULL,
  `language` VARCHAR(20) NULL,
  `membership_status` VARCHAR(20) NOT NULL DEFAULT 'free',
  `membership_expire_at` DATETIME NULL,
  `total_dream_count` INT NOT NULL DEFAULT 0,
  `consecutive_days` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_login_at` DATETIME NULL,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_mobile` (`mobile`),
  UNIQUE KEY `uk_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `dream_records` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `dream_text` TEXT NOT NULL,
  `emotion_after_waking` VARCHAR(30) NULL,
  `dream_people` JSON NULL,
  `dream_symbols` JSON NULL,
  `auto_title` VARCHAR(100) NULL,
  `tags` JSON NULL,
  `summary` VARCHAR(255) NULL,
  `base_interpretation` TEXT NULL,
  `deep_interpretation` TEXT NULL,
  `result_version` VARCHAR(20) NULL,
  `source_type` VARCHAR(20) NULL,
  `is_produced_success` TINYINT(1) NOT NULL DEFAULT 0,
  `is_saved` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_dream_records_user_id` (`user_id`),
  CONSTRAINT `fk_dream_records_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `dream_followups` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `dream_record_id` BIGINT NOT NULL,
  `user_id` BIGINT NOT NULL,
  `followup_question` VARCHAR(255) NOT NULL,
  `user_answer` TEXT NULL,
  `followup_interpretation` TEXT NULL,
  `round_no` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_dream_followups_dream_record_id` (`dream_record_id`),
  KEY `idx_dream_followups_user_id` (`user_id`),
  CONSTRAINT `fk_dream_followups_dream_record_id`
    FOREIGN KEY (`dream_record_id`) REFERENCES `dream_records` (`id`),
  CONSTRAINT `fk_dream_followups_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `daily_fortunes` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `fortune_date` DATE NOT NULL,
  `overall_status` VARCHAR(255) NULL,
  `reminder_text` TEXT NULL,
  `love_text` VARCHAR(255) NULL,
  `career_text` VARCHAR(255) NULL,
  `self_text` VARCHAR(255) NULL,
  `good_for` JSON NULL,
  `avoid_for` JSON NULL,
  `lucky_color` VARCHAR(50) NULL,
  `lucky_time` VARCHAR(50) NULL,
  `full_content` TEXT NULL,
  `is_pro_content` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_daily_fortunes_user_date` (`user_id`, `fortune_date`),
  CONSTRAINT `fk_daily_fortunes_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `orders` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `order_no` VARCHAR(64) NOT NULL,
  `product_type` VARCHAR(30) NOT NULL,
  `product_name` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'CNY',
  `pay_status` VARCHAR(20) NOT NULL DEFAULT 'unpaid',
  `pay_channel` VARCHAR(30) NULL,
  `paid_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_orders_order_no` (`order_no`),
  KEY `idx_orders_user_id` (`user_id`),
  CONSTRAINT `fk_orders_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `memberships` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `plan_type` VARCHAR(20) NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  `start_at` DATETIME NOT NULL,
  `expire_at` DATETIME NOT NULL,
  `auto_renew` TINYINT(1) NOT NULL DEFAULT 0,
  `source_channel` VARCHAR(30) NULL,
  `order_id` BIGINT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_memberships_user_id` (`user_id`),
  KEY `idx_memberships_order_id` (`order_id`),
  CONSTRAINT `fk_memberships_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_memberships_order_id`
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `feedbacks` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `target_type` VARCHAR(20) NOT NULL,
  `target_id` BIGINT NOT NULL,
  `feedback_type` VARCHAR(20) NOT NULL,
  `content` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_feedbacks_user_id` (`user_id`),
  KEY `idx_feedbacks_target_id` (`target_id`),
  CONSTRAINT `fk_feedbacks_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `prompt_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NULL,
  `business_type` VARCHAR(30) NOT NULL,
  `prompt_version` VARCHAR(20) NULL,
  `input_payload` JSON NULL,
  `output_payload` TEXT NULL,
  `status` VARCHAR(20) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_prompt_logs_user_id` (`user_id`),
  CONSTRAINT `fk_prompt_logs_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
