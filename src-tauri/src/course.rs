use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{MySqlPool, Row};
use tauri::State;
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CourseSection {
    pub id: String,
    pub name: String,
    #[serde(rename = "sortOrder")]
    pub sort_order: i32,
    pub collapsed: bool,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Course {
    pub id: String,
    pub name: String,
    pub description: String,
    #[serde(rename = "sectionId")]
    pub section_id: Option<String>,
    #[serde(rename = "lastWorkspaceMode")]
    pub last_workspace_mode: String,
    #[serde(rename = "sortOrder")]
    pub sort_order: i32,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CourseStore {
    pub sections: Vec<CourseSection>,
    pub courses: Vec<Course>,
    #[serde(rename = "activeCourseId")]
    pub active_course_id: Option<String>,
}

#[tauri::command]
pub async fn courses_load(pool: State<'_, MySqlPool>) -> Result<CourseStore, String> {
    let section_records = sqlx::query(
        "SELECT id, name, sort_order, collapsed, created_at, updated_at 
         FROM knowledge_sections 
         WHERE deleted_at IS NULL 
         ORDER BY sort_order ASC, updated_at DESC",
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut sections = Vec::new();
    for row in section_records {
        let created_at: Option<DateTime<Utc>> = row.try_get("created_at").unwrap_or_default();
        let updated_at: Option<DateTime<Utc>> = row.try_get("updated_at").unwrap_or_default();
        sections.push(CourseSection {
            id: row.try_get("id").unwrap_or_default(),
            name: row.try_get("name").unwrap_or_default(),
            sort_order: row.try_get("sort_order").unwrap_or(0),
            collapsed: row.try_get::<i32, _>("collapsed").unwrap_or(0) != 0,
            created_at: created_at.map(|d| d.to_rfc3339()).unwrap_or_default(),
            updated_at: updated_at.map(|d| d.to_rfc3339()).unwrap_or_default(),
        });
    }

    let course_records = sqlx::query(
        "SELECT id, name, description, section_id, last_workspace_mode, sort_order, created_at, updated_at 
         FROM course_management_courses 
         WHERE deleted_at IS NULL 
         ORDER BY COALESCE(section_id, ''), sort_order ASC, updated_at DESC",
    )
    .fetch_all(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut courses = Vec::new();
    for row in course_records {
        let created_at: Option<DateTime<Utc>> = row.try_get("created_at").unwrap_or_default();
        let updated_at: Option<DateTime<Utc>> = row.try_get("updated_at").unwrap_or_default();
        courses.push(Course {
            id: row.try_get("id").unwrap_or_default(),
            name: row.try_get("name").unwrap_or_default(),
            description: row.try_get("description").unwrap_or_default(),
            section_id: row.try_get("section_id").unwrap_or_default(),
            last_workspace_mode: row.try_get("last_workspace_mode").unwrap_or_default(),
            sort_order: row.try_get("sort_order").unwrap_or(0),
            created_at: created_at.map(|d| d.to_rfc3339()).unwrap_or_default(),
            updated_at: updated_at.map(|d| d.to_rfc3339()).unwrap_or_default(),
        });
    }

    let active_course_id = courses.first().map(|c| c.id.clone());

    Ok(CourseStore {
        sections,
        courses,
        active_course_id,
    })
}

// =======================
// COURSES
// =======================

#[derive(Deserialize)]
pub struct CourseCreateInput {
    pub name: String,
    pub description: String,
    #[serde(rename = "sectionId")]
    pub section_id: Option<String>,
}

#[tauri::command]
pub async fn course_create(input: CourseCreateInput, pool: State<'_, MySqlPool>) -> Result<CourseStore, String> {
    let now = Utc::now();
    let id = format!("c_{}", Uuid::new_v4().to_string().replace("-", ""));

    let max_sort: i32 = sqlx::query("SELECT COALESCE(MAX(sort_order), -1) as ms FROM course_management_courses WHERE section_id = ? AND deleted_at IS NULL")
        .bind(&input.section_id)
        .fetch_one(&*pool)
        .await
        .map(|row| row.try_get("ms").unwrap_or(-1))
        .unwrap_or(-1);

    sqlx::query(
        "INSERT INTO course_management_courses (id, name, description, section_id, last_workspace_mode, sort_order, created_at, updated_at, deleted_at) 
         VALUES (?, ?, ?, ?, 'mindmap', ?, ?, ?, NULL)"
    )
    .bind(&id)
    .bind(&input.name)
    .bind(&input.description)
    .bind(&input.section_id)
    .bind(max_sort + 1)
    .bind(now)
    .bind(now)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    courses_load(pool).await
}

#[derive(Deserialize)]
pub struct CourseRenameInput {
    pub id: String,
    pub name: String,
    pub description: String,
}

#[tauri::command]
pub async fn course_rename(input: CourseRenameInput, pool: State<'_, MySqlPool>) -> Result<CourseStore, String> {
    sqlx::query("UPDATE course_management_courses SET name = ?, description = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL")
        .bind(&input.name)
        .bind(&input.description)
        .bind(Utc::now())
        .bind(&input.id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    courses_load(pool).await
}

#[derive(Deserialize)]
pub struct CourseMoveInput {
    pub id: String,
    #[serde(rename = "sectionId")]
    pub section_id: Option<String>,
}

#[tauri::command]
pub async fn course_move(input: CourseMoveInput, pool: State<'_, MySqlPool>) -> Result<CourseStore, String> {
    let max_sort: i32 = sqlx::query("SELECT COALESCE(MAX(sort_order), -1) as ms FROM course_management_courses WHERE section_id = ? AND deleted_at IS NULL")
        .bind(&input.section_id)
        .fetch_one(&*pool)
        .await
        .map(|row| row.try_get("ms").unwrap_or(-1))
        .unwrap_or(-1);

    sqlx::query("UPDATE course_management_courses SET section_id = ?, sort_order = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL")
        .bind(&input.section_id)
        .bind(max_sort + 1)
        .bind(Utc::now())
        .bind(&input.id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    courses_load(pool).await
}

#[derive(Deserialize)]
pub struct CourseReorderInput {
    pub id: String,
    #[serde(rename = "sectionId")]
    pub section_id: Option<String>,
    #[serde(rename = "beforeCourseId")]
    pub before_course_id: Option<String>,
}

#[tauri::command]
pub async fn course_reorder(input: CourseReorderInput, pool: State<'_, MySqlPool>) -> Result<CourseStore, String> {
    let mut store = courses_load(pool.clone()).await?;

    let moving_idx = store.courses.iter().position(|c| c.id == input.id).ok_or("Course not found")?;
    let mut course = store.courses.remove(moving_idx);
    course.section_id = input.section_id.clone();

    let mut filtered_courses: Vec<_> = store.courses.into_iter().filter(|c| c.section_id == input.section_id).collect();
    let insert_idx = if let Some(ref bid) = input.before_course_id {
        filtered_courses.iter().position(|c| c.id == *bid).unwrap_or(filtered_courses.len())
    } else {
        filtered_courses.len()
    };
    filtered_courses.insert(insert_idx, course);

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    for (i, c) in filtered_courses.iter().enumerate() {
        sqlx::query("UPDATE course_management_courses SET sort_order = ?, section_id = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL")
            .bind(i as i32)
            .bind(&input.section_id)
            .bind(Utc::now())
            .bind(&c.id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }
    tx.commit().await.map_err(|e| e.to_string())?;

    courses_load(pool).await
}

#[tauri::command]
pub async fn course_delete(id: String, pool: State<'_, MySqlPool>) -> Result<CourseStore, String> {
    sqlx::query("UPDATE course_management_courses SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL")
        .bind(Utc::now())
        .bind(Utc::now())
        .bind(&id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    courses_load(pool).await
}

// =======================
// SECTIONS
// =======================

#[derive(Deserialize)]
pub struct SectionCreateInput {
    pub name: String,
}

#[tauri::command]
pub async fn section_create(input: SectionCreateInput, pool: State<'_, MySqlPool>) -> Result<CourseStore, String> {
    let now = Utc::now();
    let id = format!("s_{}", Uuid::new_v4().to_string().replace("-", ""));

    let max_sort: i32 = sqlx::query("SELECT COALESCE(MAX(sort_order), -1) as ms FROM knowledge_sections WHERE deleted_at IS NULL")
        .fetch_one(&*pool)
        .await
        .map(|row| row.try_get("ms").unwrap_or(-1))
        .unwrap_or(-1);

    sqlx::query(
        "INSERT INTO knowledge_sections (id, name, sort_order, collapsed, created_at, updated_at, deleted_at) 
         VALUES (?, ?, ?, 0, ?, ?, NULL)"
    )
    .bind(&id)
    .bind(&input.name)
    .bind(max_sort + 1)
    .bind(now)
    .bind(now)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    courses_load(pool).await
}

#[derive(Deserialize)]
pub struct SectionRenameInput {
    pub id: String,
    pub name: String,
}

#[tauri::command]
pub async fn section_rename(input: SectionRenameInput, pool: State<'_, MySqlPool>) -> Result<CourseStore, String> {
    sqlx::query("UPDATE knowledge_sections SET name = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL")
        .bind(&input.name)
        .bind(Utc::now())
        .bind(&input.id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    courses_load(pool).await
}

#[derive(Deserialize)]
pub struct SectionToggleInput {
    pub id: String,
    pub collapsed: bool,
}

#[tauri::command]
pub async fn section_toggle(input: SectionToggleInput, pool: State<'_, MySqlPool>) -> Result<CourseStore, String> {
    sqlx::query("UPDATE knowledge_sections SET collapsed = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL")
        .bind(if input.collapsed { 1 } else { 0 })
        .bind(Utc::now())
        .bind(&input.id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    courses_load(pool).await
}

#[derive(Deserialize)]
pub struct SectionToggleAllInput {
    pub collapsed: bool,
}

#[tauri::command]
pub async fn section_toggle_all(input: SectionToggleAllInput, pool: State<'_, MySqlPool>) -> Result<CourseStore, String> {
    sqlx::query("UPDATE knowledge_sections SET collapsed = ?, updated_at = ? WHERE deleted_at IS NULL")
        .bind(if input.collapsed { 1 } else { 0 })
        .bind(Utc::now())
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    courses_load(pool).await
}

#[derive(Deserialize)]
pub struct SectionReorderInput {
    pub id: String,
    #[serde(rename = "beforeSectionId")]
    pub before_section_id: Option<String>,
}

#[tauri::command]
pub async fn section_reorder(input: SectionReorderInput, pool: State<'_, MySqlPool>) -> Result<CourseStore, String> {
    let mut store = courses_load(pool.clone()).await?;

    let moving_idx = store.sections.iter().position(|s| s.id == input.id).ok_or("Section not found")?;
    let section = store.sections.remove(moving_idx);

    let insert_idx = if let Some(ref bid) = input.before_section_id {
        store.sections.iter().position(|s| s.id == *bid).unwrap_or(store.sections.len())
    } else {
        store.sections.len()
    };
    store.sections.insert(insert_idx, section);

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    for (i, s) in store.sections.iter().enumerate() {
        sqlx::query("UPDATE knowledge_sections SET sort_order = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL")
            .bind(i as i32)
            .bind(Utc::now())
            .bind(&s.id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }
    tx.commit().await.map_err(|e| e.to_string())?;

    courses_load(pool).await
}

#[tauri::command]
pub async fn section_delete(id: String, pool: State<'_, MySqlPool>) -> Result<CourseStore, String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    
    let now = Utc::now();
    sqlx::query("UPDATE knowledge_sections SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL")
        .bind(now)
        .bind(now)
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("UPDATE course_management_courses SET section_id = NULL, updated_at = ? WHERE section_id = ? AND deleted_at IS NULL")
        .bind(now)
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    courses_load(pool).await
}

#[tauri::command]
pub async fn courses_save_store(
    store: CourseStore,
    pool: State<'_, MySqlPool>,
) -> Result<CourseStore, String> {
    // Keep this as a fallback for any bulk save logic
    // We shouldn't delete it unless we're sure no code uses it
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    let now = Utc::now();
    
    if store.sections.is_empty() {
        sqlx::query("UPDATE knowledge_sections SET deleted_at = COALESCE(deleted_at, ?) WHERE deleted_at IS NULL")
            .bind(now).execute(&mut *tx).await.map_err(|e| e.to_string())?;
    } else {
        let section_ids: Vec<String> = store.sections.iter().map(|s| s.id.clone()).collect();
        let query_str = format!("UPDATE knowledge_sections SET deleted_at = COALESCE(deleted_at, ?) WHERE deleted_at IS NULL AND id NOT IN ('{}')", section_ids.join("','"));
        sqlx::query(&query_str).bind(now).execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    for section in &store.sections {
        let created_dt = DateTime::parse_from_rfc3339(&section.created_at).unwrap_or_else(|_| Utc::now().into()).with_timezone(&Utc);
        let updated_dt = DateTime::parse_from_rfc3339(&section.updated_at).unwrap_or_else(|_| Utc::now().into()).with_timezone(&Utc);
        sqlx::query("INSERT INTO knowledge_sections (id, name, sort_order, collapsed, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, NULL) ON DUPLICATE KEY UPDATE name = VALUES(name), sort_order = VALUES(sort_order), collapsed = VALUES(collapsed), updated_at = VALUES(updated_at), deleted_at = NULL")
        .bind(&section.id).bind(&section.name).bind(section.sort_order).bind(if section.collapsed { 1 } else { 0 }).bind(created_dt).bind(updated_dt).execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    if store.courses.is_empty() {
        sqlx::query("UPDATE course_management_courses SET deleted_at = COALESCE(deleted_at, ?) WHERE deleted_at IS NULL").bind(now).execute(&mut *tx).await.map_err(|e| e.to_string())?;
    } else {
        let course_ids: Vec<String> = store.courses.iter().map(|c| c.id.clone()).collect();
        let query_str = format!("UPDATE course_management_courses SET deleted_at = COALESCE(deleted_at, ?) WHERE deleted_at IS NULL AND id NOT IN ('{}')", course_ids.join("','"));
        sqlx::query(&query_str).bind(now).execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    for course in &store.courses {
        let created_dt = DateTime::parse_from_rfc3339(&course.created_at).unwrap_or_else(|_| Utc::now().into()).with_timezone(&Utc);
        let updated_dt = DateTime::parse_from_rfc3339(&course.updated_at).unwrap_or_else(|_| Utc::now().into()).with_timezone(&Utc);
        sqlx::query("INSERT INTO course_management_courses (id, name, description, section_id, last_workspace_mode, sort_order, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL) ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), section_id = VALUES(section_id), last_workspace_mode = VALUES(last_workspace_mode), sort_order = VALUES(sort_order), updated_at = VALUES(updated_at), deleted_at = NULL")
        .bind(&course.id).bind(&course.name).bind(&course.description).bind(&course.section_id).bind(&course.last_workspace_mode).bind(course.sort_order).bind(created_dt).bind(updated_dt).execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(store)
}
