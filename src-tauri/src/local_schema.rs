use sqlx::SqlitePool;

const SQLITE_DDL_STATEMENTS: &[&str] = &[
    // ── Time Management ──
    "CREATE TABLE IF NOT EXISTS time_management_roles (
        id TEXT NOT NULL PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT,
        created_at INTEGER NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
    )",

    "CREATE TABLE IF NOT EXISTS time_management_tasks (
        id TEXT NOT NULL PRIMARY KEY,
        title TEXT NOT NULL,
        role_id TEXT NULL,
        quadrant TEXT NOT NULL,
        scheduled_date TEXT NULL,
        time_of_day TEXT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        completed_at INTEGER NULL,
        description TEXT NULL,
        deadline INTEGER NULL,
        updated_at TEXT DEFAULT (datetime('now'))
    )",

    // ── Daily Review ──
    "CREATE TABLE IF NOT EXISTS daily_reviews (
        id TEXT NOT NULL PRIMARY KEY,
        date TEXT NOT NULL,
        content TEXT NOT NULL,
        rating INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (date)
    )",

    // ── List module ──
    "CREATE TABLE IF NOT EXISTS list_folders (
        id TEXT NOT NULL PRIMARY KEY,
        name TEXT NOT NULL,
        is_pinned INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT NULL
    )",

    "CREATE TABLE IF NOT EXISTS list_lists (
        id TEXT NOT NULL PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT '',
        color TEXT NOT NULL DEFAULT '#000000',
        view_type TEXT NOT NULL DEFAULT 'list',
        folder_id TEXT NULL,
        is_pinned INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT NULL
    )",

    "CREATE TABLE IF NOT EXISTS list_note_groups (
        id TEXT NOT NULL PRIMARY KEY,
        list_id TEXT NOT NULL,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )",

    "CREATE TABLE IF NOT EXISTS list_notes (
        id TEXT NOT NULL PRIMARY KEY,
        list_id TEXT NOT NULL,
        group_id TEXT NULL,
        title TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL,
        is_pinned INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT NULL
    )",

    "CREATE TABLE IF NOT EXISTS list_templates (
        id TEXT NOT NULL PRIMARY KEY,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )",

    // ── App preferences ──
    "CREATE TABLE IF NOT EXISTS app_preferences (
        pref_key TEXT NOT NULL PRIMARY KEY,
        pref_value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
    )",

    // ── Mission module ──
    "CREATE TABLE IF NOT EXISTS mission_statement (
        id TEXT NOT NULL PRIMARY KEY,
        content TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )",

    "CREATE TABLE IF NOT EXISTS mission_roles (
        id TEXT NOT NULL PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )",

    "CREATE TABLE IF NOT EXISTS mission_goals (
        id TEXT NOT NULL PRIMARY KEY,
        role_id TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'not_started',
        time_scope TEXT NOT NULL DEFAULT 'long',
        start_date TEXT NULL,
        end_date TEXT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )",

    // ── Habit Tracking ──
    "CREATE TABLE IF NOT EXISTS habits (
        id TEXT NOT NULL PRIMARY KEY,
        name TEXT NOT NULL,
        frequency TEXT NULL,
        goal TEXT NULL,
        start_date TEXT NULL,
        duration TEXT NULL,
        category TEXT NULL,
        reminder TEXT NULL,
        auto_popup_log INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )",

    "CREATE TABLE IF NOT EXISTS habit_checkins (
        id TEXT NOT NULL PRIMARY KEY,
        habit_id TEXT NOT NULL,
        date TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (habit_id, date)
    )",

    // ── Pomodoro Focus ──
    "CREATE TABLE IF NOT EXISTS pomodoro_records (
        id TEXT NOT NULL PRIMARY KEY,
        mode TEXT NOT NULL,
        phase TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        date TEXT NOT NULL,
        date_label TEXT NOT NULL,
        time_range_label TEXT NOT NULL,
        task_id TEXT NULL,
        linked_target TEXT NULL,
        created_at TEXT NOT NULL
    )",

    "CREATE TABLE IF NOT EXISTS pomodoro_favorites (
        id TEXT NOT NULL PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT '😊',
        mode TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        accumulated_minutes INTEGER NOT NULL DEFAULT 0,
        linked_target TEXT NULL,
        is_archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
    )",

    // ── Sync Queue (for Phase 2 cloud sync) ──
    "CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        action TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(table_name, record_id, action)
    )",

    // ── Indexes ──
    "CREATE INDEX IF NOT EXISTS idx_list_lists_folder ON list_lists(folder_id, sort_order)",
    "CREATE INDEX IF NOT EXISTS idx_list_notes_list_group ON list_notes(list_id, group_id, sort_order)",
    "CREATE INDEX IF NOT EXISTS idx_list_notes_pinned ON list_notes(list_id, is_pinned)",
    "CREATE INDEX IF NOT EXISTS idx_list_note_groups_list ON list_note_groups(list_id, sort_order)",
    "CREATE INDEX IF NOT EXISTS idx_mission_goals_role ON mission_goals(role_id, sort_order)",
    "CREATE INDEX IF NOT EXISTS idx_habit_checkins_habit ON habit_checkins(habit_id)",
];

/// Create all tables in the local SQLite database.
pub async fn ensure_local_tables(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    for sql in SQLITE_DDL_STATEMENTS {
        sqlx::query(*sql).execute(pool).await?;
    }
    Ok(())
}
