use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool, Row};
use tauri::State;

#[derive(Serialize, Deserialize, Debug, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct DailyReviewRow {
    pub id: String,
    pub date: String,
    pub content: String,
    pub rating: Option<i32>,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
}

#[tauri::command]
pub async fn daily_review_load_all(pool: State<'_, SqlitePool>) -> Result<Vec<DailyReviewRow>, String> {
    let rows = sqlx::query(
        "SELECT id, date, content, rating, created_at, updated_at FROM daily_reviews"
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows
        .into_iter()
        .map(|r| {
            let parse_ms = |val: Option<String>| -> Option<i64> {
                let s = val?;
                if let Ok(ms) = s.parse::<i64>() {
                    Some(ms)
                } else if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(&s) {
                    Some(dt.timestamp_millis())
                } else if let Ok(naive) = chrono::NaiveDateTime::parse_from_str(&s, "%Y-%m-%d %H:%M:%S%.f") {
                    Some(naive.and_utc().timestamp_millis())
                } else if let Ok(naive) = chrono::NaiveDateTime::parse_from_str(&s, "%Y-%m-%d %H:%M:%S") {
                    Some(naive.and_utc().timestamp_millis())
                } else {
                    None
                }
            };

            let created_at_str: Option<String> = r.try_get("created_at").ok();
            let updated_at_str: Option<String> = r.try_get("updated_at").ok();

            DailyReviewRow {
                id: r.try_get("id").unwrap_or_default(),
                date: r.try_get("date").unwrap_or_default(),
                content: r.try_get("content").unwrap_or_default(),
                rating: r.try_get("rating").ok(),
                created_at: parse_ms(created_at_str),
                updated_at: parse_ms(updated_at_str),
            }
        })
        .collect())
}

#[tauri::command]
pub async fn daily_review_save(review: DailyReviewRow, pool: State<'_, SqlitePool>) -> Result<(), String> {
    let created_at_value = review.created_at.unwrap_or_else(|| {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as i64
    });

    // Convert ms timestamp to ISO string for SQLite storage
    let created_iso = chrono::DateTime::from_timestamp_millis(created_at_value)
        .map(|dt| dt.format("%Y-%m-%d %H:%M:%S%.3f").to_string())
        .unwrap_or_else(|| chrono::Utc::now().format("%Y-%m-%d %H:%M:%S%.3f").to_string());
    let now_iso = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S%.3f").to_string();

    sqlx::query(
        "INSERT INTO daily_reviews (id, date, content, rating, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
            content = excluded.content,
            rating = excluded.rating,
            updated_at = excluded.updated_at"
    )
    .bind(&review.id)
    .bind(&review.date)
    .bind(&review.content)
    .bind(review.rating)
    .bind(&created_iso)
    .bind(&now_iso)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

use crate::db::TidbState;

#[tauri::command]
pub async fn daily_review_delete(
    id: String,
    pool: State<'_, SqlitePool>,
    tidb_state: State<'_, TidbState>
) -> Result<(), String> {
    sqlx::query("DELETE FROM daily_reviews WHERE id = ?")
        .bind(&id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    let _ = sqlx::query("INSERT OR REPLACE INTO sync_queue (table_name, record_id, action) VALUES ('daily_reviews', ?, 'DELETE')")
        .bind(&id)
        .execute(&*pool)
        .await;

    if let Some(ref mysql) = *tidb_state.inner().0.read().await {
        if let Ok(_) = sqlx::query("DELETE FROM daily_reviews WHERE id = ?").bind(&id).execute(mysql).await {
            let _ = sqlx::query("DELETE FROM sync_queue WHERE table_name = 'daily_reviews' AND record_id = ? AND action = 'DELETE'").bind(&id).execute(&*pool).await;
        }
    }

    Ok(())
}
