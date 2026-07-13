use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::{MySqlPool, Row};
use tauri::State;

#[derive(Serialize, Deserialize, Debug)]
pub struct MindMapDocument {
    #[serde(rename = "courseId")]
    pub course_id: String,
    #[serde(rename = "mapId")]
    pub map_id: String,
    pub title: String,
    pub snapshot: Option<Value>,
    #[serde(rename = "updatedAt")]
    pub updated_at: Option<String>,
    #[serde(rename = "nodeCount")]
    pub node_count: i32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct MindMapSaveRequest {
    #[serde(rename = "courseId")]
    pub course_id: String,
    #[serde(rename = "mapId")]
    pub map_id: Option<String>,
    pub title: String,
    pub snapshot: Value,
}

#[tauri::command]
pub async fn mindmaps_load(
    course_id: String,
    map_id: String,
    pool: State<'_, MySqlPool>,
) -> Result<MindMapDocument, String> {
    let map_record = sqlx::query(
        "SELECT id, title, current_snapshot_id, node_count, updated_at 
         FROM mind_maps 
         WHERE id = ? AND course_id = ? AND deleted_at IS NULL",
    )
    .bind(&map_id)
    .bind(&course_id)
    .fetch_optional(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let map = match map_record {
        Some(row) => row,
        None => return Err("Mind map not found".to_string()),
    };

    let title: String = map.try_get("title").unwrap_or_default();
    let current_snapshot_id: Option<String> = map.try_get("current_snapshot_id").unwrap_or_default();
    let node_count: i32 = map.try_get("node_count").unwrap_or(0);

    let updated_at_val: Option<DateTime<Utc>> = map.try_get("updated_at").unwrap_or_default();
    let updated_at = updated_at_val.map(|dt| dt.to_rfc3339());

    let mut snapshot = None;
    if let Some(snap_id) = current_snapshot_id {
        let snap_record = sqlx::query(
            "SELECT payload_json FROM mind_map_snapshots WHERE id = ? AND mind_map_id = ?",
        )
        .bind(&snap_id)
        .bind(&map_id)
        .fetch_optional(&*pool)
        .await
        .map_err(|e| e.to_string())?;

        if let Some(row) = snap_record {
            let payload_str: String = row.try_get("payload_json").unwrap_or_default();
            if let Ok(parsed) = serde_json::from_str(&payload_str) {
                snapshot = Some(parsed);
            }
        }
    }

    Ok(MindMapDocument {
        course_id,
        map_id,
        title,
        snapshot,
        updated_at,
        node_count,
    })
}

fn generate_id(prefix: &str) -> String {
    format!("{}_{}", prefix, uuid::Uuid::new_v4().to_string().replace("-", ""))
}

#[tauri::command]
pub async fn mindmaps_save(
    request: MindMapSaveRequest,
    pool: State<'_, MySqlPool>,
) -> Result<(), String> {
    let now = Utc::now();
    let map_id = request.map_id.unwrap_or_else(|| generate_id("mindmap"));
    let snap_id = generate_id("mmsnap");

    let payload_str = serde_json::to_string(&request.snapshot).map_err(|e| e.to_string())?;
    let byte_size = payload_str.len() as i32;

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    sqlx::query(
        "INSERT INTO mind_maps (id, course_id, title, root_node_id, current_snapshot_id, node_count, created_at, updated_at)
         VALUES (?, ?, ?, 'root', ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title = VALUES(title), current_snapshot_id = VALUES(current_snapshot_id), updated_at = VALUES(updated_at)"
    )
    .bind(&map_id)
    .bind(&request.course_id)
    .bind(&request.title)
    .bind(&snap_id)
    .bind(1) // simple node count
    .bind(now)
    .bind(now)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query(
        "INSERT INTO mind_map_snapshots (id, mind_map_id, sequence_no, schema_version, editor, editor_version, payload_json, payload_hash, byte_size, created_at)
         VALUES (?, ?, 1, 1, 'simple-mind-map', '1.0', ?, 'hash', ?, ?)"
    )
    .bind(&snap_id)
    .bind(&map_id)
    .bind(&payload_str)
    .bind(byte_size)
    .bind(now)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(())
}
