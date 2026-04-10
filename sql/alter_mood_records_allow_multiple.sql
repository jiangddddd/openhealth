SET @drop_unique_index_sql = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'mood_records'
        AND index_name = 'uq_mood_records_user_date'
    ),
    'ALTER TABLE `mood_records` DROP INDEX `uq_mood_records_user_date`',
    'SELECT 1'
  )
);

PREPARE stmt FROM @drop_unique_index_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
