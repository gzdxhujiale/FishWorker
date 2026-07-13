use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::{MySqlPool, Row};
use tauri::State;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct KnowledgeDocumentLoadRequest {
    #[serde(rename = "courseId")]
    pub course_id: String,
    #[serde(rename = "mindMapId")]
    pub mind_map_id: String,
    #[serde(rename = "nodeId")]
    pub node_id: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct KnowledgeDocument {
    #[serde(rename = "courseId")]
    pub course_id: String,
    #[serde(rename = "mindMapId")]
    pub mind_map_id: String,
    #[serde(rename = "nodeId")]
    pub node_id: String,
    #[serde(rename = "documentId")]
    pub document_id: String,
    pub title: String,
    pub snapshot: Option<Value>,
    #[serde(rename = "updatedAt")]
    pub updated_at: Option<String>,
    #[serde(rename = "byteSize")]
    pub byte_size: i32,
    #[serde(rename = "hasContent")]
    pub has_content: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct KnowledgeDocumentSaveRequest {
    #[serde(rename = "courseId")]
    pub course_id: String,
    #[serde(rename = "mindMapId")]
    pub mind_map_id: String,
    #[serde(rename = "nodeId")]
    pub node_id: String,
    pub title: String,
    pub snapshot: Value,
}

#[tauri::command]
pub async fn knowledge_documents_load(
    request: KnowledgeDocumentLoadRequest,
    pool: State<'_, MySqlPool>,
) -> Result<Option<KnowledgeDocument>, String> {
    let doc_record = sqlx::query(
        "SELECT id, title, current_snapshot_id, current_byte_size, has_content, updated_at 
         FROM knowledge_documents 
         WHERE node_id = ? AND mind_map_id = ? AND course_id = ? AND deleted_at IS NULL",
    )
    .bind(&request.node_id)
    .bind(&request.mind_map_id)
    .bind(&request.course_id)
    .fetch_optional(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    if let Some(doc) = doc_record {
        let document_id: String = doc.try_get("id").unwrap_or_default();
        let title: String = doc.try_get("title").unwrap_or_default();
        let current_snapshot_id: Option<String> = doc.try_get("current_snapshot_id").unwrap_or_default();
        let byte_size: i32 = doc.try_get("current_byte_size").unwrap_or(0);
        let has_content: bool = doc.try_get::<i32, _>("has_content").unwrap_or(0) != 0;
        let updated_at_val: Option<DateTime<Utc>> = doc.try_get("updated_at").unwrap_or_default();
        let updated_at = updated_at_val.map(|dt| dt.to_rfc3339());

        let mut snapshot = None;
        if let Some(snap_id) = current_snapshot_id {
            let snap_record = sqlx::query(
                "SELECT payload_json FROM knowledge_document_snapshots WHERE id = ? AND document_id = ?",
            )
            .bind(&snap_id)
            .bind(&document_id)
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

        Ok(Some(KnowledgeDocument {
            course_id: request.course_id,
            mind_map_id: request.mind_map_id,
            node_id: request.node_id,
            document_id,
            title,
            snapshot,
            updated_at,
            byte_size,
            has_content,
        }))
    } else {
        Ok(None)
    }
}

fn generate_id(prefix: &str) -> String {
    format!("{}_{}", prefix, uuid::Uuid::new_v4().to_string().replace("-", ""))
}

#[tauri::command]
pub async fn knowledge_documents_save(
    request: KnowledgeDocumentSaveRequest,
    pool: State<'_, MySqlPool>,
) -> Result<KnowledgeDocument, String> {
    let now = Utc::now();
    let payload_str = serde_json::to_string(&request.snapshot).map_err(|e| e.to_string())?;
    let byte_size = payload_str.len() as i32;
    let has_content = byte_size > 50; // simple heuristic

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // Check if document exists
    let existing_doc = sqlx::query("SELECT id FROM knowledge_documents WHERE node_id = ? AND mind_map_id = ? AND course_id = ? AND deleted_at IS NULL")
        .bind(&request.node_id)
        .bind(&request.mind_map_id)
        .bind(&request.course_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    let document_id = match existing_doc {
        Some(row) => row.try_get("id").unwrap_or_else(|_| generate_id("kdoc")),
        None => generate_id("kdoc")
    };

    let snap_id = generate_id("kdocsnap");

    sqlx::query(
        "INSERT INTO knowledge_documents (id, course_id, mind_map_id, node_id, title, current_snapshot_id, current_byte_size, has_content, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
         ON DUPLICATE KEY UPDATE title = VALUES(title), current_snapshot_id = VALUES(current_snapshot_id), current_byte_size = VALUES(current_byte_size), has_content = VALUES(has_content), updated_at = VALUES(updated_at)"
    )
    .bind(&document_id)
    .bind(&request.course_id)
    .bind(&request.mind_map_id)
    .bind(&request.node_id)
    .bind(&request.title)
    .bind(&snap_id)
    .bind(byte_size)
    .bind(if has_content { 1 } else { 0 })
    .bind(now)
    .bind(now)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    let max_seq_result: Option<i32> = sqlx::query_scalar("SELECT MAX(sequence_no) FROM knowledge_document_snapshots WHERE document_id = ?")
        .bind(&document_id)
        .fetch_optional(&mut *tx)
        .await
        .unwrap_or(None);
    let next_seq = max_seq_result.unwrap_or(0) + 1;

    sqlx::query(
        "INSERT INTO knowledge_document_snapshots (id, document_id, sequence_no, schema_version, editor, editor_version, payload_json, payload_hash, byte_size, created_at)
         VALUES (?, ?, ?, 1, 'canvas-editor', '1.0', ?, 'hash', ?, ?)"
    )
    .bind(&snap_id)
    .bind(&document_id)
    .bind(next_seq)
    .bind(&payload_str)
    .bind(byte_size)
    .bind(now)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(KnowledgeDocument {
        course_id: request.course_id,
        mind_map_id: request.mind_map_id,
        node_id: request.node_id,
        document_id,
        title: request.title,
        snapshot: Some(request.snapshot),
        updated_at: Some(now.to_rfc3339()),
        byte_size,
        has_content,
    })
}
