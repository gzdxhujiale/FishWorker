use sqlx::sqlite::{SqlitePool, SqlitePoolOptions, SqliteConnectOptions};
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
