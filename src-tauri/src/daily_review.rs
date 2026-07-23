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
        "SELECT id, date, content, rating,
         CAST(strftime('%s', created_at) * 1000 AS INTEGER) as created_at_ms,
         CAST(strftime('%s', updated_at) * 1000 AS INTEGER) as updated_at_ms
         FROM daily_reviews"
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows
        .into_iter()
        .map(|r| DailyReviewRow {
            id: r.try_get("id").unwrap_or_default(),
            date: r.try_get("date").unwrap_or_default(),
            content: r.try_get("content").unwrap_or_default(),
            rating: r.try_get("rating").ok(),
            created_at: r.try_get::<i64, _>("created_at_ms").ok(),
            updated_at: r.try_get::<i64, _>("updated_at_ms").ok(),
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

    if let Some(ref mysql) = *tidb_state.inner().0.read().await {
        let _ = sqlx::query("DELETE FROM daily_reviews WHERE id = ?").bind(&id).execute(mysql).await;
    }

    Ok(())
}
