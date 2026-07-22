use sqlx::sqlite::{SqlitePool, SqlitePoolOptions, SqliteConnectOptions};
use sqlx::{MySqlPool, Row};
use std::path::PathBuf;
use std::str::FromStr;

/// Get the local database file path under the user's AppData directory.
fn get_local_db_path() -> PathBuf {
    let app_data = std::env::var("APPDATA")
        .unwrap_or_else(|_| "C:\\Users\\Default\\AppData\\Roaming".to_string());
    let dir = PathBuf::from(app_data).join("AIstudy").join("data");
    if !dir.exists() {
        let _ = std::fs::create_dir_all(&dir);
    }
    dir.join("fishworker.db")
}

/// Establish a connection pool to the local SQLite database.
/// Creates the database file and parent directories if they don't exist.
pub async fn establish_local_connection() -> Result<SqlitePool, sqlx::Error> {
    let db_path = get_local_db_path();
    let db_url = format!("sqlite:{}?mode=rwc", db_path.display());

    let options = SqliteConnectOptions::from_str(&db_url)?
        .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
        .busy_timeout(std::time::Duration::from_secs(5))
        .create_if_missing(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await?;

    // Enable WAL mode for better concurrent read/write performance
    sqlx::query("PRAGMA journal_mode=WAL;")
        .execute(&pool)
        .await?;
    sqlx::query("PRAGMA synchronous=NORMAL;")
        .execute(&pool)
        .await?;
    sqlx::query("PRAGMA foreign_keys=ON;")
        .execute(&pool)
        .await?;

    Ok(pool)
}

/// Pull all existing user data from remote TiDB MySQL into local SQLite (safe sync migration on startup).
pub async fn pull_from_tidb(mysql: &MySqlPool, sqlite: &SqlitePool) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // 1. list_folders
    if let Ok(rows) = sqlx::query("SELECT id, name, is_pinned, sort_order, created_at, updated_at, deleted_at FROM list_folders").fetch_all(mysql).await {
        for r in rows {
            let id: String = r.try_get("id").unwrap_or_default();
            let name: String = r.try_get("name").unwrap_or_default();
            let is_pinned: i32 = r.try_get::<i8, _>("is_pinned").map(|v| v as i32).unwrap_or(0);
            let sort_order: i32 = r.try_get("sort_order").unwrap_or(0);
            let created_at = r.try_get::<chrono::NaiveDateTime, _>("created_at").map(|d| d.to_string()).unwrap_or_default();
            let updated_at = r.try_get::<chrono::NaiveDateTime, _>("updated_at").map(|d| d.to_string()).unwrap_or_default();
            let deleted_at = r.try_get::<Option<chrono::NaiveDateTime>, _>("deleted_at").ok().flatten().map(|d| d.to_string());

            let _ = sqlx::query(
                "INSERT OR IGNORE INTO list_folders (id, name, is_pinned, sort_order, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
            ).bind(id).bind(name).bind(is_pinned).bind(sort_order).bind(created_at).bind(updated_at).bind(deleted_at).execute(sqlite).await;
        }
    }

    // 2. list_lists
    if let Ok(rows) = sqlx::query("SELECT id, name, icon, color, view_type, folder_id, is_pinned, sort_order, created_at, updated_at, deleted_at FROM list_lists").fetch_all(mysql).await {
        for r in rows {
            let id: String = r.try_get("id").unwrap_or_default();
            let name: String = r.try_get("name").unwrap_or_default();
            let icon: String = r.try_get("icon").unwrap_or_default();
            let color: String = r.try_get("color").unwrap_or_default();
            let view_type: String = r.try_get("view_type").unwrap_or_default();
            let folder_id: Option<String> = r.try_get("folder_id").ok();
            let is_pinned: i32 = r.try_get::<i8, _>("is_pinned").map(|v| v as i32).unwrap_or(0);
            let sort_order: i32 = r.try_get("sort_order").unwrap_or(0);
            let created_at = r.try_get::<chrono::NaiveDateTime, _>("created_at").map(|d| d.to_string()).unwrap_or_default();
            let updated_at = r.try_get::<chrono::NaiveDateTime, _>("updated_at").map(|d| d.to_string()).unwrap_or_default();
            let deleted_at = r.try_get::<Option<chrono::NaiveDateTime>, _>("deleted_at").ok().flatten().map(|d| d.to_string());

            let _ = sqlx::query(
                "INSERT OR IGNORE INTO list_lists (id, name, icon, color, view_type, folder_id, is_pinned, sort_order, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            ).bind(id).bind(name).bind(icon).bind(color).bind(view_type).bind(folder_id).bind(is_pinned).bind(sort_order).bind(created_at).bind(updated_at).bind(deleted_at).execute(sqlite).await;
        }
    }

    // 3. list_note_groups
    if let Ok(rows) = sqlx::query("SELECT id, list_id, name, sort_order, created_at, updated_at FROM list_note_groups").fetch_all(mysql).await {
        for r in rows {
            let id: String = r.try_get("id").unwrap_or_default();
            let list_id: String = r.try_get("list_id").unwrap_or_default();
            let name: String = r.try_get("name").unwrap_or_default();
            let sort_order: i32 = r.try_get("sort_order").unwrap_or(0);
            let created_at = r.try_get::<chrono::NaiveDateTime, _>("created_at").map(|d| d.to_string()).unwrap_or_default();
            let updated_at = r.try_get::<chrono::NaiveDateTime, _>("updated_at").map(|d| d.to_string()).unwrap_or_default();

            let _ = sqlx::query(
                "INSERT OR IGNORE INTO list_note_groups (id, list_id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
            ).bind(id).bind(list_id).bind(name).bind(sort_order).bind(created_at).bind(updated_at).execute(sqlite).await;
        }
    }

    // 4. list_notes
    if let Ok(rows) = sqlx::query("SELECT id, list_id, group_id, title, content, is_pinned, sort_order, created_at, updated_at, deleted_at FROM list_notes").fetch_all(mysql).await {
        for r in rows {
            let id: String = r.try_get("id").unwrap_or_default();
            let list_id: String = r.try_get("list_id").unwrap_or_default();
            let group_id: Option<String> = r.try_get("group_id").ok();
            let title: String = r.try_get("title").unwrap_or_default();
            let content: String = r.try_get("content").unwrap_or_default();
            let is_pinned: i32 = r.try_get::<i8, _>("is_pinned").map(|v| v as i32).unwrap_or(0);
            let sort_order: i32 = r.try_get("sort_order").unwrap_or(0);
            let created_at = r.try_get::<chrono::NaiveDateTime, _>("created_at").map(|d| d.to_string()).unwrap_or_default();
            let updated_at = r.try_get::<chrono::NaiveDateTime, _>("updated_at").map(|d| d.to_string()).unwrap_or_default();
            let deleted_at = r.try_get::<Option<chrono::NaiveDateTime>, _>("deleted_at").ok().flatten().map(|d| d.to_string());

            let _ = sqlx::query(
                "INSERT OR IGNORE INTO list_notes (id, list_id, group_id, title, content, is_pinned, sort_order, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            ).bind(id).bind(list_id).bind(group_id).bind(title).bind(content).bind(is_pinned).bind(sort_order).bind(created_at).bind(updated_at).bind(deleted_at).execute(sqlite).await;
        }
    }

    // 5. list_templates
    if let Ok(rows) = sqlx::query("SELECT id, name, content, created_at, updated_at FROM list_templates").fetch_all(mysql).await {
        for r in rows {
            let id: String = r.try_get("id").unwrap_or_default();
            let name: String = r.try_get("name").unwrap_or_default();
            let content: String = r.try_get("content").unwrap_or_default();
            let created_at = r.try_get::<chrono::NaiveDateTime, _>("created_at").map(|d| d.to_string()).unwrap_or_default();
            let updated_at = r.try_get::<chrono::NaiveDateTime, _>("updated_at").map(|d| d.to_string()).unwrap_or_default();

            let _ = sqlx::query(
                "INSERT OR IGNORE INTO list_templates (id, name, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
            ).bind(id).bind(name).bind(content).bind(created_at).bind(updated_at).execute(sqlite).await;
        }
    }

    // 6. daily_reviews
    if let Ok(rows) = sqlx::query("SELECT id, DATE_FORMAT(date, '%Y-%m-%d') as date, content, rating, created_at, updated_at FROM daily_reviews").fetch_all(mysql).await {
        for r in rows {
            let id: String = r.try_get("id").unwrap_or_default();
            let date: String = r.try_get("date").unwrap_or_default();
            let content: String = r.try_get("content").unwrap_or_default();
            let rating: Option<i32> = r.try_get("rating").ok();
            let created_at = r.try_get::<chrono::NaiveDateTime, _>("created_at").map(|d| d.to_string()).unwrap_or_default();
            let updated_at = r.try_get::<chrono::NaiveDateTime, _>("updated_at").map(|d| d.to_string()).unwrap_or_default();

            let _ = sqlx::query(
                "INSERT OR IGNORE INTO daily_reviews (id, date, content, rating, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
            ).bind(id).bind(date).bind(content).bind(rating).bind(created_at).bind(updated_at).execute(sqlite).await;
        }
    }

    // 7. time_management_tasks
    if let Ok(rows) = sqlx::query("SELECT id, title, role_id, quadrant, scheduled_date, time_of_day, completed, created_at, completed_at, description, deadline FROM time_management_tasks").fetch_all(mysql).await {
        for r in rows {
            let id: String = r.try_get("id").unwrap_or_default();
            let title: String = r.try_get("title").unwrap_or_default();
            let role_id: Option<String> = r.try_get("role_id").ok();
            let quadrant: String = r.try_get("quadrant").unwrap_or_default();
            let scheduled_date: Option<String> = r.try_get("scheduled_date").ok();
            let time_of_day: Option<String> = r.try_get("time_of_day").ok();
            let completed: i32 = r.try_get::<i8, _>("completed").map(|v| v as i32).unwrap_or(0);
            let created_at: i64 = r.try_get("created_at").unwrap_or(0);
            let completed_at: Option<i64> = r.try_get("completed_at").ok();
            let description: Option<String> = r.try_get("description").ok();
            let deadline: Option<i64> = r.try_get("deadline").ok();

            let _ = sqlx::query(
                "INSERT OR IGNORE INTO time_management_tasks (id, title, role_id, quadrant, scheduled_date, time_of_day, completed, created_at, completed_at, description, deadline) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            ).bind(id).bind(title).bind(role_id).bind(quadrant).bind(scheduled_date).bind(time_of_day).bind(completed).bind(created_at).bind(completed_at).bind(description).bind(deadline).execute(sqlite).await;
        }
    }

    // 8. mission_statement
    if let Ok(rows) = sqlx::query("SELECT id, content, updated_at FROM mission_statement").fetch_all(mysql).await {
        for r in rows {
            let id: String = r.try_get("id").unwrap_or_default();
            let content: String = r.try_get("content").unwrap_or_default();
            let updated_at = r.try_get::<chrono::NaiveDateTime, _>("updated_at").map(|d| d.to_string()).unwrap_or_default();

            let _ = sqlx::query(
                "INSERT OR IGNORE INTO mission_statement (id, content, updated_at) VALUES (?, ?, ?)"
            ).bind(id).bind(content).bind(updated_at).execute(sqlite).await;
        }
    }

    // 9. mission_roles
    if let Ok(rows) = sqlx::query("SELECT id, name, icon, sort_order, created_at, updated_at FROM mission_roles").fetch_all(mysql).await {
        for r in rows {
            let id: String = r.try_get("id").unwrap_or_default();
            let name: String = r.try_get("name").unwrap_or_default();
            let icon: String = r.try_get("icon").unwrap_or_default();
            let sort_order: i32 = r.try_get("sort_order").unwrap_or(0);
            let created_at = r.try_get::<chrono::NaiveDateTime, _>("created_at").map(|d| d.to_string()).unwrap_or_default();
            let updated_at = r.try_get::<chrono::NaiveDateTime, _>("updated_at").map(|d| d.to_string()).unwrap_or_default();

            let _ = sqlx::query(
                "INSERT OR IGNORE INTO mission_roles (id, name, icon, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
            ).bind(id).bind(name).bind(icon).bind(sort_order).bind(created_at).bind(updated_at).execute(sqlite).await;
        }
    }

    // 10. mission_goals
    if let Ok(rows) = sqlx::query("SELECT id, role_id, title, status, time_scope, start_date, end_date, sort_order, created_at, updated_at FROM mission_goals").fetch_all(mysql).await {
        for r in rows {
            let id: String = r.try_get("id").unwrap_or_default();
            let role_id: String = r.try_get("role_id").unwrap_or_default();
            let title: String = r.try_get("title").unwrap_or_default();
            let status: String = r.try_get("status").unwrap_or_default();
            let time_scope: String = r.try_get("time_scope").unwrap_or_default();
            let start_date = r.try_get::<Option<chrono::NaiveDate>, _>("start_date").ok().flatten().map(|d| d.to_string());
            let end_date = r.try_get::<Option<chrono::NaiveDate>, _>("end_date").ok().flatten().map(|d| d.to_string());
            let sort_order: i32 = r.try_get("sort_order").unwrap_or(0);
            let created_at = r.try_get::<chrono::NaiveDateTime, _>("created_at").map(|d| d.to_string()).unwrap_or_default();
            let updated_at = r.try_get::<chrono::NaiveDateTime, _>("updated_at").map(|d| d.to_string()).unwrap_or_default();

            let _ = sqlx::query(
                "INSERT OR IGNORE INTO mission_goals (id, role_id, title, status, time_scope, start_date, end_date, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            ).bind(id).bind(role_id).bind(title).bind(status).bind(time_scope).bind(start_date).bind(end_date).bind(sort_order).bind(created_at).bind(updated_at).execute(sqlite).await;
        }
    }

    // 11. habits
    if let Ok(rows) = sqlx::query("SELECT id, name, frequency, goal, start_date, duration, category, reminder, auto_popup_log, created_at, updated_at FROM habits").fetch_all(mysql).await {
        for r in rows {
            let id: String = r.try_get("id").unwrap_or_default();
            let name: String = r.try_get("name").unwrap_or_default();
            let frequency: Option<String> = r.try_get("frequency").ok();
            let goal: Option<String> = r.try_get("goal").ok();
            let start_date: Option<String> = r.try_get("start_date").ok();
            let duration: Option<String> = r.try_get("duration").ok();
            let category: Option<String> = r.try_get("category").ok();
            let reminder: Option<String> = r.try_get("reminder").ok();
            let auto_popup_log: i32 = r.try_get::<i8, _>("auto_popup_log").map(|v| v as i32).unwrap_or(0);
            let created_at = r.try_get::<chrono::NaiveDateTime, _>("created_at").map(|d| d.to_string()).unwrap_or_default();
            let updated_at = r.try_get::<chrono::NaiveDateTime, _>("updated_at").map(|d| d.to_string()).unwrap_or_default();

            let _ = sqlx::query(
                "INSERT OR IGNORE INTO habits (id, name, frequency, goal, start_date, duration, category, reminder, auto_popup_log, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            ).bind(id).bind(name).bind(frequency).bind(goal).bind(start_date).bind(duration).bind(category).bind(reminder).bind(auto_popup_log).bind(created_at).bind(updated_at).execute(sqlite).await;
        }
    }

    // 12. habit_checkins
    if let Ok(rows) = sqlx::query("SELECT id, habit_id, date, completed, created_at, updated_at FROM habit_checkins").fetch_all(mysql).await {
        for r in rows {
            let id: String = r.try_get("id").unwrap_or_default();
            let habit_id: String = r.try_get("habit_id").unwrap_or_default();
            let date = r.try_get::<chrono::NaiveDate, _>("date").map(|d| d.to_string()).unwrap_or_default();
            let completed: i32 = r.try_get::<i8, _>("completed").map(|v| v as i32).unwrap_or(0);
            let created_at = r.try_get::<chrono::NaiveDateTime, _>("created_at").map(|d| d.to_string()).unwrap_or_default();
            let updated_at = r.try_get::<chrono::NaiveDateTime, _>("updated_at").map(|d| d.to_string()).unwrap_or_default();

            let _ = sqlx::query(
                "INSERT OR IGNORE INTO habit_checkins (id, habit_id, date, completed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
            ).bind(id).bind(habit_id).bind(date).bind(completed).bind(created_at).bind(updated_at).execute(sqlite).await;
        }
    }

    Ok(())
}
