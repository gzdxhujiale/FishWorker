use serde::{Deserialize, Serialize};
use sqlx::{MySqlPool, Row};
use tauri::State;

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DailyReviewRow {
    pub id: String,
    pub date: String, // format YYYY-MM-DD
    pub content: String,
    pub rating: Option<i32>,
    pub created_at: Option<i64>,
    pub updated_at: Option<i64>,
}

#[tauri::command]
pub async fn daily_review_load_all(pool: State<'_, MySqlPool>) -> Result<Vec<DailyReviewRow>, String> {
    let rows = sqlx::query(
        "SELECT id, DATE_FORMAT(date, '%Y-%m-%d') as date, content, rating, 
         UNIX_TIMESTAMP(created_at) * 1000 as created_at_ms, 
         UNIX_TIMESTAMP(updated_at) * 1000 as updated_at_ms 
         FROM daily_reviews"
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut reviews = Vec::new();
    for row in rows {
        let id: String = row.try_get("id").unwrap_or_default();
        let date: String = row.try_get("date").unwrap_or_default();
        let content: String = row.try_get("content").unwrap_or_default();
        let rating: Option<i32> = row.try_get("rating").ok();
        
        let created_at_ms: i64 = row.try_get("created_at_ms").unwrap_or(0);
        let updated_at_ms: i64 = row.try_get("updated_at_ms").unwrap_or(0);

        reviews.push(DailyReviewRow {
            id,
            date,
            content,
            rating,
            created_at: Some(created_at_ms),
            updated_at: Some(updated_at_ms),
        });
    }

    Ok(reviews)
}

#[tauri::command]
pub async fn daily_review_save(review: DailyReviewRow, pool: State<'_, MySqlPool>) -> Result<(), String> {
    let created_at_db = if let Some(ms) = review.created_at {
        format!("FROM_UNIXTIME({})", ms / 1000)
    } else {
        "NOW(3)".to_string()
    };
    
    let sql = format!(
        "INSERT INTO daily_reviews (id, date, content, rating, created_at, updated_at)
         VALUES (?, ?, ?, ?, {}, NOW(3))
         ON DUPLICATE KEY UPDATE 
            content = VALUES(content), 
            rating = VALUES(rating), 
            updated_at = NOW(3)",
        created_at_db
    );

    sqlx::query(&sql)
        .bind(review.id)
        .bind(review.date)
        .bind(review.content)
        .bind(review.rating)
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
