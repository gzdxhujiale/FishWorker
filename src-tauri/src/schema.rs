use futures::future::join_all;
use sqlx::MySqlPool;

const DDL_STATEMENTS: &[&str] = &[
    // ── Time Management ──
    "CREATE TABLE IF NOT EXISTS time_management_roles (
        id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        color VARCHAR(50),
        created_at BIGINT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    // ── Daily Review ──
    "CREATE TABLE IF NOT EXISTS daily_reviews (
        id VARCHAR(64) NOT NULL,
        date DATE NOT NULL,
        content LONGTEXT NOT NULL,
        rating INT,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uk_date (date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    // ── List module ──
    "CREATE TABLE IF NOT EXISTS list_folders (
        id VARCHAR(64) NOT NULL,
        name VARCHAR(255) NOT NULL,
        is_pinned TINYINT(1) NOT NULL DEFAULT 0,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        deleted_at DATETIME(3) NULL,
        PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    "CREATE TABLE IF NOT EXISTS list_note_groups (
        id VARCHAR(64) NOT NULL,
        list_id VARCHAR(64) NOT NULL,
        name VARCHAR(255) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        PRIMARY KEY (id),
        KEY idx_list_order (list_id, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    "CREATE TABLE IF NOT EXISTS list_templates (
        id VARCHAR(64) NOT NULL,
        name VARCHAR(255) NOT NULL,
        content LONGTEXT NOT NULL,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    // ── App preferences ──
    "CREATE TABLE IF NOT EXISTS app_preferences (
        pref_key VARCHAR(255) NOT NULL,
        pref_value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (pref_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    // ── Mission module ──
    "CREATE TABLE IF NOT EXISTS mission_statement (
        id VARCHAR(36) NOT NULL,
        content LONGTEXT NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    "CREATE TABLE IF NOT EXISTS mission_roles (
        id VARCHAR(36) NOT NULL,
        name VARCHAR(100) NOT NULL,
        icon VARCHAR(20) NOT NULL DEFAULT '',
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    "CREATE TABLE IF NOT EXISTS mission_goals (
        id VARCHAR(36) NOT NULL,
        role_id VARCHAR(36) NOT NULL,
        title VARCHAR(500) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'not_started',
        time_scope VARCHAR(20) NOT NULL DEFAULT 'long',
        start_date DATE NULL,
        end_date DATE NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        PRIMARY KEY (id),
        KEY idx_role_order (role_id, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    // ── Habit Tracking ──
    "CREATE TABLE IF NOT EXISTS habits (
        id VARCHAR(64) NOT NULL,
        name VARCHAR(255) NOT NULL,
        frequency VARCHAR(50) NULL,
        goal VARCHAR(50) NULL,
        start_date VARCHAR(20) NULL,
        duration VARCHAR(50) NULL,
        category VARCHAR(50) NULL,
        reminder VARCHAR(50) NULL,
        auto_popup_log TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    "CREATE TABLE IF NOT EXISTS habit_checkins (
        id VARCHAR(64) NOT NULL,
        habit_id VARCHAR(64) NOT NULL,
        date DATE NOT NULL,
        completed TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uk_habit_date (habit_id, date),
        KEY idx_habit_id (habit_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    // ── Pomodoro Focus ──
    "CREATE TABLE IF NOT EXISTS pomodoro_records (
        id VARCHAR(64) NOT NULL,
        mode VARCHAR(32) NOT NULL,
        phase VARCHAR(32) NOT NULL,
        start_time VARCHAR(64) NOT NULL,
        end_time VARCHAR(64) NOT NULL,
        duration_minutes BIGINT NOT NULL DEFAULT 0,
        date VARCHAR(20) NOT NULL,
        date_label VARCHAR(64) NOT NULL,
        time_range_label VARCHAR(64) NOT NULL,
        task_id VARCHAR(64) NULL,
        linked_target TEXT NULL,
        created_at DATETIME(3) NOT NULL,
        PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    "CREATE TABLE IF NOT EXISTS pomodoro_favorites (
        id VARCHAR(64) NOT NULL,
        name VARCHAR(255) NOT NULL,
        icon VARCHAR(64) NOT NULL DEFAULT '',
        mode VARCHAR(32) NOT NULL,
        duration_minutes BIGINT NOT NULL DEFAULT 25,
        accumulated_minutes BIGINT NOT NULL DEFAULT 0,
        linked_target TEXT NULL,
        is_archived TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME(3) NOT NULL,
        PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
];

/// 并行执行所有 DDL，将 12 次串行网络往返压缩为 1 轮并发。
pub async fn ensure_tables(pool: &MySqlPool) -> Result<(), sqlx::Error> {
    let futs: Vec<_> = DDL_STATEMENTS
        .iter()
        .map(|sql| sqlx::query(*sql).execute(pool))
        .collect();

    let results = join_all(futs).await;

    // 收集所有错误
    let errors: Vec<_> = results
        .into_iter()
        .filter_map(|r| r.err())
        .collect();

    // Migrations for newly added columns in habits
    let _ = sqlx::query("ALTER TABLE habits ADD COLUMN frequency VARCHAR(50) NULL").execute(pool).await;
    let _ = sqlx::query("ALTER TABLE habits ADD COLUMN goal VARCHAR(50) NULL").execute(pool).await;
    let _ = sqlx::query("ALTER TABLE habits ADD COLUMN start_date VARCHAR(20) NULL").execute(pool).await;
    let _ = sqlx::query("ALTER TABLE habits ADD COLUMN duration VARCHAR(50) NULL").execute(pool).await;
    let _ = sqlx::query("ALTER TABLE habits ADD COLUMN category VARCHAR(50) NULL").execute(pool).await;
    let _ = sqlx::query("ALTER TABLE habits ADD COLUMN reminder VARCHAR(50) NULL").execute(pool).await;
    let _ = sqlx::query("ALTER TABLE habits ADD COLUMN auto_popup_log TINYINT(1) NOT NULL DEFAULT 0").execute(pool).await;

    if errors.is_empty() {
        Ok(())
    } else {
        // 返回第一个错误，但日志记录全部
        for e in &errors {
            eprintln!("Schema creation error: {}", e);
        }
        Err(errors.into_iter().next().unwrap())
    }
}
