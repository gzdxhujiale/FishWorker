use serde::{Deserialize, Serialize};
use sqlx::{FromRow, MySqlPool};
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

/// Helper struct for database row with native datetime types
#[derive(FromRow)]
struct DailyReviewDbRow {
    id: String,
    date: String,
    content: String,
    rating: Option<i32>,
    created_at_ms: Option<i64>,
    updated_at_ms: Option<i64>,
}

#[tauri::command]
pub async fn daily_review_load_all(pool: State<'_, MySqlPool>) -> Result<Vec<DailyReviewRow>, String> {
    let rows = sqlx::query_as::<_, DailyReviewDbRow>(
        "SELECT id, DATE_FORMAT(date, '%Y-%m-%d') as date, content, rating, 
         CAST(UNIX_TIMESTAMP(created_at) * 1000 AS SIGNED) as created_at_ms, 
         CAST(UNIX_TIMESTAMP(updated_at) * 1000 AS SIGNED) as updated_at_ms 
         FROM daily_reviews"
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows
        .into_iter()
        .map(|r| DailyReviewRow {
            id: r.id,
            date: r.date,
            content: r.content,
            rating: r.rating,
            created_at: r.created_at_ms,
            updated_at: r.updated_at_ms,
        })
        .collect())
}

#[tauri::command]
pub async fn daily_review_save(review: DailyReviewRow, pool: State<'_, MySqlPool>) -> Result<(), String> {
    // Use parameterized query - let MySQL handle the timestamp conversion
    let created_at_value = review.created_at.unwrap_or_else(|| {
        // Current time in milliseconds
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as i64
    });

    sqlx::query(
        "INSERT INTO daily_reviews (id, date, content, rating, created_at, updated_at)
         VALUES (?, ?, ?, ?, FROM_UNIXTIME(? / 1000), NOW(3))
         ON DUPLICATE KEY UPDATE 
            content = VALUES(content), 
            rating = VALUES(rating), 
            updated_at = NOW(3)"
    )
    .bind(&review.id)
    .bind(&review.date)
    .bind(&review.content)
    .bind(review.rating)
    .bind(created_at_value)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn daily_review_delete(id: String, pool: State<'_, MySqlPool>) -> Result<(), String> {
    sqlx::query("DELETE FROM daily_reviews WHERE id = ?")
        .bind(id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
