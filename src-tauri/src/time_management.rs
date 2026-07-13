use serde_json::Value;
use sqlx::MySqlPool;
use tauri::State;

#[tauri::command]
pub async fn time_management_load(pool: State<'_, MySqlPool>) -> Result<Option<Value>, String> {
    let row: Option<(String,)> = sqlx::query_as("SELECT payload_json FROM time_management_data WHERE id = 'default'")
        .fetch_optional(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    if let Some((payload_str,)) = row {
        let value: Value = serde_json::from_str(&payload_str).map_err(|e| e.to_string())?;
        Ok(Some(value))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn time_management_save(payload: Value, pool: State<'_, MySqlPool>) -> Result<(), String> {
    let payload_str = serde_json::to_string(&payload).map_err(|e| e.to_string())?;
    
    sqlx::query(
        "INSERT INTO time_management_data (id, payload_json, updated_at)
         VALUES ('default', ?, NOW(3))
         ON DUPLICATE KEY UPDATE payload_json = VALUES(payload_json), updated_at = VALUES(updated_at)"
    )
    .bind(payload_str)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}
