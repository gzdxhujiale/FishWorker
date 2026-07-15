use sqlx::MySqlPool;

pub async fn ensure_tables(pool: &MySqlPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS time_management_roles (
            id VARCHAR(36) NOT NULL,
            name VARCHAR(255) NOT NULL,
            color VARCHAR(50),
            created_at BIGINT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ).execute(pool).await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS time_management_tasks (
            id VARCHAR(36) NOT NULL,
            title VARCHAR(255) NOT NULL,
            role_id VARCHAR(36) NULL,
            quadrant VARCHAR(10) NOT NULL,
            scheduled_date VARCHAR(20) NULL,
            time_of_day VARCHAR(20) NULL,
            completed TINYINT(1) NOT NULL DEFAULT 0,
            created_at BIGINT NOT NULL,
            completed_at BIGINT NULL,
            description TEXT NULL,
            deadline BIGINT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ).execute(pool).await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS daily_reviews (
            id VARCHAR(64) NOT NULL,
            date DATE NOT NULL,
            content LONGTEXT NOT NULL,
            rating INT,
            created_at DATETIME(3) NOT NULL,
            updated_at DATETIME(3) NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uk_date (date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ).execute(pool).await?;

    // ── List module tables ──

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS list_folders (
            id VARCHAR(64) NOT NULL,
            name VARCHAR(255) NOT NULL,
            is_pinned TINYINT(1) NOT NULL DEFAULT 0,
            sort_order INT NOT NULL DEFAULT 0,
            created_at DATETIME(3) NOT NULL,
            updated_at DATETIME(3) NOT NULL,
            deleted_at DATETIME(3) NULL,
            PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ).execute(pool).await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS list_lists (
            id VARCHAR(64) NOT NULL,
            name VARCHAR(255) NOT NULL,
            icon VARCHAR(64) NOT NULL DEFAULT '',
            color VARCHAR(32) NOT NULL DEFAULT '#000000',
            view_type VARCHAR(16) NOT NULL DEFAULT 'list',
            folder_id VARCHAR(64) NULL,
            is_pinned TINYINT(1) NOT NULL DEFAULT 0,
            sort_order INT NOT NULL DEFAULT 0,
            created_at DATETIME(3) NOT NULL,
            updated_at DATETIME(3) NOT NULL,
            deleted_at DATETIME(3) NULL,
            PRIMARY KEY (id),
            KEY idx_folder_order (folder_id, sort_order)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ).execute(pool).await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS list_note_groups (
            id VARCHAR(64) NOT NULL,
            list_id VARCHAR(64) NOT NULL,
            name VARCHAR(255) NOT NULL,
            sort_order INT NOT NULL DEFAULT 0,
            created_at DATETIME(3) NOT NULL,
            updated_at DATETIME(3) NOT NULL,
            PRIMARY KEY (id),
            KEY idx_list_order (list_id, sort_order)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ).execute(pool).await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS list_notes (
            id VARCHAR(64) NOT NULL,
            list_id VARCHAR(64) NOT NULL,
            group_id VARCHAR(64) NULL,
            title VARCHAR(255) NOT NULL DEFAULT '',
            content LONGTEXT NOT NULL,
            is_pinned TINYINT(1) NOT NULL DEFAULT 0,
            sort_order INT NOT NULL DEFAULT 0,
            created_at DATETIME(3) NOT NULL,
            updated_at DATETIME(3) NOT NULL,
            deleted_at DATETIME(3) NULL,
            PRIMARY KEY (id),
            KEY idx_list_group_order (list_id, group_id, sort_order),
            KEY idx_list_pinned (list_id, is_pinned)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ).execute(pool).await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS list_templates (
            id VARCHAR(64) NOT NULL,
            name VARCHAR(255) NOT NULL,
            content LONGTEXT NOT NULL,
            created_at DATETIME(3) NOT NULL,
            updated_at DATETIME(3) NOT NULL,
            PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ).execute(pool).await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS app_preferences (
            pref_key VARCHAR(255) NOT NULL,
            pref_value TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (pref_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ).execute(pool).await?;

    Ok(())
}
