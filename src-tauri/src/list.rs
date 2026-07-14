use serde::{Deserialize, Serialize};
use sqlx::{MySqlPool, Row};
use tauri::State;

// ── Data types ──

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ListFolder {
    pub id: String,
    pub name: String,
    pub is_pinned: bool,
    pub sort_order: i32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ListList {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub color: String,
    pub view_type: String,
    pub folder_id: Option<String>,
    pub is_pinned: bool,
    pub sort_order: i32,
    #[serde(skip_deserializing, default)]
    pub item_count: i64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ListNoteGroup {
    pub id: String,
    pub list_id: String,
    pub name: String,
    pub sort_order: i32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ListNote {
    pub id: String,
    pub list_id: String,
    pub group_id: Option<String>,
    pub title: String,
    pub content: String,
    pub is_pinned: bool,
    pub sort_order: i32,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ListTemplate {
    pub id: String,
    pub name: String,
    pub content: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ListAllData {
    pub folders: Vec<ListFolder>,
    pub lists: Vec<ListList>,
    pub note_groups: Vec<ListNoteGroup>,
    pub notes: Vec<ListNote>,
    pub templates: Vec<ListTemplate>,
}

// ── Helper: current timestamp as milliseconds ──

fn now_ms() -> i64 {
    chrono::Utc::now().timestamp_millis()
}

fn now_dt() -> chrono::DateTime<chrono::Utc> {
    chrono::Utc::now()
}

// ── Load all ──

#[tauri::command]
pub async fn list_load_all(pool: State<'_, MySqlPool>) -> Result<ListAllData, String> {
    // Folders
    let folder_rows = sqlx::query(
        "SELECT id, name, is_pinned, sort_order FROM list_folders WHERE deleted_at IS NULL ORDER BY sort_order"
    ).fetch_all(&*pool).await.map_err(|e| e.to_string())?;

    let mut folders = Vec::new();
    for row in folder_rows {
        folders.push(ListFolder {
            id: row.try_get("id").unwrap_or_default(),
            name: row.try_get("name").unwrap_or_default(),
            is_pinned: row.try_get::<i8, _>("is_pinned").map(|v| v != 0).unwrap_or(false),
            sort_order: row.try_get("sort_order").unwrap_or(0),
        });
    }

    // Lists with item_count
    let list_rows = sqlx::query(
        "SELECT l.id, l.name, l.icon, l.color, l.view_type, l.folder_id, l.is_pinned, l.sort_order,
                COALESCE(n.cnt, 0) AS item_count
         FROM list_lists l
         LEFT JOIN (SELECT list_id, COUNT(*) AS cnt FROM list_notes WHERE deleted_at IS NULL GROUP BY list_id) n
           ON n.list_id = l.id
         WHERE l.deleted_at IS NULL
         ORDER BY l.is_pinned DESC, l.sort_order"
    ).fetch_all(&*pool).await.map_err(|e| e.to_string())?;

    let mut lists = Vec::new();
    for row in list_rows {
        lists.push(ListList {
            id: row.try_get("id").unwrap_or_default(),
            name: row.try_get("name").unwrap_or_default(),
            icon: row.try_get("icon").unwrap_or_default(),
            color: row.try_get("color").unwrap_or_default(),
            view_type: row.try_get("view_type").unwrap_or_else(|_| "list".to_string()),
            folder_id: row.try_get("folder_id").unwrap_or(None),
            is_pinned: row.try_get::<i8, _>("is_pinned").map(|v| v != 0).unwrap_or(false),
            sort_order: row.try_get("sort_order").unwrap_or(0),
            item_count: row.try_get("item_count").unwrap_or(0),
        });
    }

    // Note groups
    let group_rows = sqlx::query(
        "SELECT id, list_id, name, sort_order FROM list_note_groups ORDER BY sort_order"
    ).fetch_all(&*pool).await.map_err(|e| e.to_string())?;

    let mut note_groups = Vec::new();
    for row in group_rows {
        note_groups.push(ListNoteGroup {
            id: row.try_get("id").unwrap_or_default(),
            list_id: row.try_get("list_id").unwrap_or_default(),
            name: row.try_get("name").unwrap_or_default(),
            sort_order: row.try_get("sort_order").unwrap_or(0),
        });
    }

    // Notes
    let note_rows = sqlx::query(
        "SELECT id, list_id, group_id, title, content, is_pinned, sort_order, 
                UNIX_TIMESTAMP(created_at)*1000 AS created_at_ms, UNIX_TIMESTAMP(updated_at)*1000 AS updated_at_ms
         FROM list_notes WHERE deleted_at IS NULL
         ORDER BY is_pinned DESC, sort_order, updated_at DESC"
    ).fetch_all(&*pool).await.map_err(|e| e.to_string())?;

    let mut notes = Vec::new();
    for row in note_rows {
        notes.push(ListNote {
            id: row.try_get("id").unwrap_or_default(),
            list_id: row.try_get("list_id").unwrap_or_default(),
            group_id: row.try_get("group_id").unwrap_or(None),
            title: row.try_get("title").unwrap_or_default(),
            content: row.try_get("content").unwrap_or_default(),
            is_pinned: row.try_get::<i8, _>("is_pinned").map(|v| v != 0).unwrap_or(false),
            sort_order: row.try_get("sort_order").unwrap_or(0),
            created_at: row.try_get::<i64, _>("created_at_ms").unwrap_or(0),
            updated_at: row.try_get::<i64, _>("updated_at_ms").unwrap_or(0),
        });
    }

    // Templates
    let tpl_rows = sqlx::query(
        "SELECT id, name, content FROM list_templates"
    ).fetch_all(&*pool).await.map_err(|e| e.to_string())?;

    let mut templates = Vec::new();
    for row in tpl_rows {
        templates.push(ListTemplate {
            id: row.try_get("id").unwrap_or_default(),
            name: row.try_get("name").unwrap_or_default(),
            content: row.try_get("content").unwrap_or_default(),
        });
    }

    Ok(ListAllData { folders, lists, note_groups, notes, templates })
}

// ── Folder CRUD ──

#[tauri::command]
pub async fn list_upsert_folder(folder: ListFolder, pool: State<'_, MySqlPool>) -> Result<(), String> {
    let now = now_dt();
    let pinned: i8 = if folder.is_pinned { 1 } else { 0 };
    sqlx::query(
        "INSERT INTO list_folders (id, name, is_pinned, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), is_pinned = VALUES(is_pinned), sort_order = VALUES(sort_order), updated_at = VALUES(updated_at)"
    )
    .bind(&folder.id)
    .bind(&folder.name)
    .bind(pinned)
    .bind(folder.sort_order)
    .bind(now)
    .bind(now)
    .execute(&*pool).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn list_delete_folder(id: String, pool: State<'_, MySqlPool>) -> Result<(), String> {
    let now = now_dt();
    // Soft-delete folder
    sqlx::query("UPDATE list_folders SET deleted_at = ? WHERE id = ?")
        .bind(now).bind(&id)
        .execute(&*pool).await.map_err(|e| e.to_string())?;
    // Unlink lists from folder
    sqlx::query("UPDATE list_lists SET folder_id = NULL, updated_at = ? WHERE folder_id = ?")
        .bind(now).bind(&id)
        .execute(&*pool).await.map_err(|e| e.to_string())?;
    Ok(())
}

// ── List CRUD ──

#[tauri::command]
pub async fn list_upsert_list(list: ListList, pool: State<'_, MySqlPool>) -> Result<(), String> {
    let now = now_dt();
    let pinned: i8 = if list.is_pinned { 1 } else { 0 };
    sqlx::query(
        "INSERT INTO list_lists (id, name, icon, color, view_type, folder_id, is_pinned, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            name = VALUES(name), icon = VALUES(icon), color = VALUES(color),
            view_type = VALUES(view_type), folder_id = VALUES(folder_id),
            is_pinned = VALUES(is_pinned), sort_order = VALUES(sort_order),
            updated_at = VALUES(updated_at)"
    )
    .bind(&list.id)
    .bind(&list.name)
    .bind(&list.icon)
    .bind(&list.color)
    .bind(&list.view_type)
    .bind(&list.folder_id)
    .bind(pinned)
    .bind(list.sort_order)
    .bind(now)
    .bind(now)
    .execute(&*pool).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn list_delete_list(id: String, pool: State<'_, MySqlPool>) -> Result<(), String> {
    let now = now_dt();
    // Soft-delete list
    sqlx::query("UPDATE list_lists SET deleted_at = ? WHERE id = ?")
        .bind(now).bind(&id)
        .execute(&*pool).await.map_err(|e| e.to_string())?;
    // Soft-delete associated notes
    sqlx::query("UPDATE list_notes SET deleted_at = ? WHERE list_id = ? AND deleted_at IS NULL")
        .bind(now).bind(&id)
        .execute(&*pool).await.map_err(|e| e.to_string())?;
    // Delete associated groups (hard delete – groups have no deleted_at)
    sqlx::query("DELETE FROM list_note_groups WHERE list_id = ?")
        .bind(&id)
        .execute(&*pool).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn list_reorder_lists(items: Vec<(String, i32)>, pool: State<'_, MySqlPool>) -> Result<(), String> {
    let now = now_dt();
    for (id, order) in &items {
        sqlx::query("UPDATE list_lists SET sort_order = ?, updated_at = ? WHERE id = ?")
            .bind(order).bind(now).bind(id)
            .execute(&*pool).await.map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn list_move_list(list_id: String, folder_id: Option<String>, sort_order: i32, pool: State<'_, MySqlPool>) -> Result<(), String> {
    let now = now_dt();
    sqlx::query("UPDATE list_lists SET folder_id = ?, sort_order = ?, updated_at = ? WHERE id = ?")
        .bind(&folder_id).bind(sort_order).bind(now).bind(&list_id)
        .execute(&*pool).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn list_duplicate_list(source_id: String, new_list: ListList, pool: State<'_, MySqlPool>) -> Result<(), String> {
    let now = now_dt();
    let now_ms_val = now_ms();

    // Insert new list
    let pinned: i8 = if new_list.is_pinned { 1 } else { 0 };
    sqlx::query(
        "INSERT INTO list_lists (id, name, icon, color, view_type, folder_id, is_pinned, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&new_list.id)
    .bind(&new_list.name)
    .bind(&new_list.icon)
    .bind(&new_list.color)
    .bind(&new_list.view_type)
    .bind(&new_list.folder_id)
    .bind(pinned)
    .bind(new_list.sort_order)
    .bind(now)
    .bind(now)
    .execute(&*pool).await.map_err(|e| e.to_string())?;

    // Copy groups, building old→new id mapping
    let group_rows = sqlx::query("SELECT id, list_id, name, sort_order FROM list_note_groups WHERE list_id = ?")
        .bind(&source_id)
        .fetch_all(&*pool).await.map_err(|e| e.to_string())?;

    let mut group_id_map: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    for row in &group_rows {
        let old_id: String = row.try_get("id").unwrap_or_default();
        let new_id = format!("group-{}-{}", now_ms_val, uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("x"));
        let name: String = row.try_get("name").unwrap_or_default();
        let sort_order: i32 = row.try_get("sort_order").unwrap_or(0);

        sqlx::query(
            "INSERT INTO list_note_groups (id, list_id, name, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(&new_id)
        .bind(&new_list.id)
        .bind(&name)
        .bind(sort_order)
        .bind(now)
        .bind(now)
        .execute(&*pool).await.map_err(|e| e.to_string())?;

        group_id_map.insert(old_id, new_id);
    }

    // Copy notes
    let note_rows = sqlx::query(
        "SELECT id, group_id, title, content, is_pinned, sort_order FROM list_notes WHERE list_id = ? AND deleted_at IS NULL"
    )
    .bind(&source_id)
    .fetch_all(&*pool).await.map_err(|e| e.to_string())?;

    for row in &note_rows {
        let old_group_id: Option<String> = row.try_get("group_id").unwrap_or(None);
        let new_group_id = old_group_id.and_then(|gid| group_id_map.get(&gid).cloned());
        let new_note_id = format!("note-{}-{}", now_ms_val, uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("x"));
        let title: String = row.try_get("title").unwrap_or_default();
        let content: String = row.try_get("content").unwrap_or_default();
        let is_pinned: i8 = row.try_get::<i8, _>("is_pinned").unwrap_or(0);
        let sort_order: i32 = row.try_get("sort_order").unwrap_or(0);

        sqlx::query(
            "INSERT INTO list_notes (id, list_id, group_id, title, content, is_pinned, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&new_note_id)
        .bind(&new_list.id)
        .bind(&new_group_id)
        .bind(&title)
        .bind(&content)
        .bind(is_pinned)
        .bind(sort_order)
        .bind(now)
        .bind(now)
        .execute(&*pool).await.map_err(|e| e.to_string())?;
    }

    Ok(())
}

// ── Note CRUD ──

#[tauri::command]
pub async fn list_upsert_note(note: ListNote, pool: State<'_, MySqlPool>) -> Result<(), String> {
    let now = now_dt();
    let pinned: i8 = if note.is_pinned { 1 } else { 0 };
    sqlx::query(
        "INSERT INTO list_notes (id, list_id, group_id, title, content, is_pinned, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            list_id = VALUES(list_id), group_id = VALUES(group_id),
            title = VALUES(title), content = VALUES(content),
            is_pinned = VALUES(is_pinned), sort_order = VALUES(sort_order),
            updated_at = VALUES(updated_at)"
    )
    .bind(&note.id)
    .bind(&note.list_id)
    .bind(&note.group_id)
    .bind(&note.title)
    .bind(&note.content)
    .bind(pinned)
    .bind(note.sort_order)
    .bind(now)
    .bind(now)
    .execute(&*pool).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn list_delete_note(id: String, pool: State<'_, MySqlPool>) -> Result<(), String> {
    let now = now_dt();
    sqlx::query("UPDATE list_notes SET deleted_at = ? WHERE id = ?")
        .bind(now).bind(&id)
        .execute(&*pool).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn list_move_note(note_id: String, list_id: String, group_id: Option<String>, sort_order: i32, pool: State<'_, MySqlPool>) -> Result<(), String> {
    let now = now_dt();
    sqlx::query("UPDATE list_notes SET list_id = ?, group_id = ?, sort_order = ?, updated_at = ? WHERE id = ?")
        .bind(&list_id).bind(&group_id).bind(sort_order).bind(now).bind(&note_id)
        .execute(&*pool).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn list_reorder_notes(items: Vec<(String, i32)>, pool: State<'_, MySqlPool>) -> Result<(), String> {
    let now = now_dt();
    for (id, order) in &items {
        sqlx::query("UPDATE list_notes SET sort_order = ?, updated_at = ? WHERE id = ?")
            .bind(order).bind(now).bind(id)
            .execute(&*pool).await.map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ── Note Group CRUD ──

#[tauri::command]
pub async fn list_upsert_group(group: ListNoteGroup, pool: State<'_, MySqlPool>) -> Result<(), String> {
    let now = now_dt();
    sqlx::query(
        "INSERT INTO list_note_groups (id, list_id, name, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), sort_order = VALUES(sort_order), updated_at = VALUES(updated_at)"
    )
    .bind(&group.id)
    .bind(&group.list_id)
    .bind(&group.name)
    .bind(group.sort_order)
    .bind(now)
    .bind(now)
    .execute(&*pool).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn list_delete_group(id: String, pool: State<'_, MySqlPool>) -> Result<(), String> {
    let now = now_dt();
    // Move notes in this group to ungrouped
    sqlx::query("UPDATE list_notes SET group_id = NULL, updated_at = ? WHERE group_id = ? AND deleted_at IS NULL")
        .bind(now).bind(&id)
        .execute(&*pool).await.map_err(|e| e.to_string())?;
    // Hard-delete the group
    sqlx::query("DELETE FROM list_note_groups WHERE id = ?")
        .bind(&id)
        .execute(&*pool).await.map_err(|e| e.to_string())?;
    Ok(())
}

// ── Template CRUD ──

#[tauri::command]
pub async fn list_upsert_template(template: ListTemplate, pool: State<'_, MySqlPool>) -> Result<(), String> {
    let now = now_dt();
    sqlx::query(
        "INSERT INTO list_templates (id, name, content, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), content = VALUES(content), updated_at = VALUES(updated_at)"
    )
    .bind(&template.id)
    .bind(&template.name)
    .bind(&template.content)
    .bind(now)
    .bind(now)
    .execute(&*pool).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn list_delete_template(id: String, pool: State<'_, MySqlPool>) -> Result<(), String> {
    sqlx::query("DELETE FROM list_templates WHERE id = ?")
        .bind(&id)
        .execute(&*pool).await.map_err(|e| e.to_string())?;
    Ok(())
}

// ── Migration from localStorage ──

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MigrationData {
    pub folders: Vec<MigrationFolder>,
    pub lists: Vec<MigrationList>,
    pub note_groups: Vec<MigrationNoteGroup>,
    pub notes: Vec<MigrationNote>,
    pub templates: Vec<MigrationTemplate>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MigrationFolder {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub is_pinned: Option<bool>,
    #[serde(default)]
    pub sort_order: Option<i32>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MigrationList {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(default)]
    pub color: Option<String>,
    #[serde(default)]
    pub view_type: Option<String>,
    pub folder_id: Option<String>,
    #[serde(default)]
    pub is_pinned: Option<bool>,
    #[serde(default)]
    pub sort_order: Option<i32>,
    #[serde(default)]
    #[allow(dead_code)]
    pub item_count: Option<i32>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MigrationNoteGroup {
    pub id: String,
    pub list_id: String,
    pub name: String,
    #[serde(default)]
    pub sort_order: Option<i32>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MigrationNote {
    pub id: String,
    pub list_id: String,
    pub group_id: Option<String>,
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub content: Option<String>,
    #[serde(default)]
    pub is_pinned: Option<bool>,
    #[serde(default)]
    pub sort_order: Option<i32>,
    #[serde(default)]
    pub created_at: Option<i64>,
    #[serde(default)]
    pub updated_at: Option<i64>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MigrationTemplate {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub content: Option<String>,
}

#[tauri::command]
pub async fn list_migrate_from_local(data: MigrationData, pool: State<'_, MySqlPool>) -> Result<(), String> {
    let now = now_dt();

    // Migrate folders
    for f in &data.folders {
        let pinned: i8 = if f.is_pinned.unwrap_or(false) { 1 } else { 0 };
        sqlx::query(
            "INSERT IGNORE INTO list_folders (id, name, is_pinned, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(&f.id).bind(&f.name).bind(pinned).bind(f.sort_order.unwrap_or(0))
        .bind(now).bind(now)
        .execute(&*pool).await.map_err(|e| e.to_string())?;
    }

    // Migrate lists
    for l in &data.lists {
        let pinned: i8 = if l.is_pinned.unwrap_or(false) { 1 } else { 0 };
        let icon = l.icon.as_deref().unwrap_or("");
        let color = l.color.as_deref().unwrap_or("#000000");
        let view_type = l.view_type.as_deref().unwrap_or("list");
        sqlx::query(
            "INSERT IGNORE INTO list_lists (id, name, icon, color, view_type, folder_id, is_pinned, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&l.id).bind(&l.name).bind(icon).bind(color).bind(view_type)
        .bind(&l.folder_id).bind(pinned).bind(l.sort_order.unwrap_or(0))
        .bind(now).bind(now)
        .execute(&*pool).await.map_err(|e| e.to_string())?;
    }

    // Migrate note groups
    for g in &data.note_groups {
        sqlx::query(
            "INSERT IGNORE INTO list_note_groups (id, list_id, name, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(&g.id).bind(&g.list_id).bind(&g.name).bind(g.sort_order.unwrap_or(0))
        .bind(now).bind(now)
        .execute(&*pool).await.map_err(|e| e.to_string())?;
    }

    // Migrate notes
    for n in &data.notes {
        let pinned: i8 = if n.is_pinned.unwrap_or(false) { 1 } else { 0 };
        let ca = n.created_at.unwrap_or(0);
        let ua = n.updated_at.unwrap_or(0);
        let created = chrono::DateTime::from_timestamp_millis(ca)
            .unwrap_or_else(|| now);
        let updated = chrono::DateTime::from_timestamp_millis(ua)
            .unwrap_or_else(|| now);
        let title = n.title.as_deref().unwrap_or("");
        let content = n.content.as_deref().unwrap_or("");
        sqlx::query(
            "INSERT IGNORE INTO list_notes (id, list_id, group_id, title, content, is_pinned, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&n.id).bind(&n.list_id).bind(&n.group_id).bind(title).bind(content)
        .bind(pinned).bind(n.sort_order.unwrap_or(0))
        .bind(created).bind(updated)
        .execute(&*pool).await.map_err(|e| e.to_string())?;
    }

    // Migrate templates
    for t in &data.templates {
        let content = t.content.as_deref().unwrap_or("");
        sqlx::query(
            "INSERT IGNORE INTO list_templates (id, name, content, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?)"
        )
        .bind(&t.id).bind(&t.name).bind(content)
        .bind(now).bind(now)
        .execute(&*pool).await.map_err(|e| e.to_string())?;
    }

    Ok(())
}

