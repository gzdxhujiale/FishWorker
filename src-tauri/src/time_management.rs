use serde::{Deserialize, Serialize};
use sqlx::{MySqlPool, Row};
use tauri::State;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Role {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
    pub created_at: i64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub title: String,
    pub role_id: Option<String>,
    pub quadrant: String,
    pub scheduled_date: Option<String>,
    pub time_of_day: Option<String>,
    pub completed: bool,
    pub created_at: i64,
    pub completed_at: Option<i64>,
    pub description: Option<String>,
    pub deadline: Option<i64>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TimeManagementData {
    pub roles: Vec<Role>,
    pub tasks: Vec<Task>,
}

#[tauri::command]
pub async fn tm_load_all(pool: State<'_, MySqlPool>) -> Result<TimeManagementData, String> {
    let roles_rows = sqlx::query("SELECT id, name, color, created_at FROM time_management_roles")
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    let mut roles = Vec::new();
    for row in roles_rows {
        roles.push(Role {
            id: row.try_get("id").unwrap_or_default(),
            name: row.try_get("name").unwrap_or_default(),
            color: row.try_get("color").unwrap_or_default(),
            created_at: row.try_get("created_at").unwrap_or_default(),
        });
    }

    let tasks_rows = sqlx::query("SELECT id, title, role_id, quadrant, scheduled_date, time_of_day, completed, created_at, completed_at, description, deadline FROM time_management_tasks")
        .fetch_all(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    let mut tasks = Vec::new();
    for row in tasks_rows {
        tasks.push(Task {
            id: row.try_get("id").unwrap_or_default(),
            title: row.try_get("title").unwrap_or_default(),
            role_id: row.try_get("role_id").unwrap_or_default(),
            quadrant: row.try_get("quadrant").unwrap_or_default(),
            scheduled_date: row.try_get("scheduled_date").unwrap_or_default(),
            time_of_day: row.try_get("time_of_day").unwrap_or_default(),
            completed: row.try_get::<i8, _>("completed").map(|v| v != 0).or_else(|_| row.try_get::<bool, _>("completed")).unwrap_or(false),
            created_at: row.try_get("created_at").unwrap_or_default(),
            completed_at: row.try_get("completed_at").unwrap_or_default(),
            description: row.try_get("description").unwrap_or_default(),
            deadline: row.try_get("deadline").unwrap_or_default(),
        });
    }

    Ok(TimeManagementData { roles, tasks })
}

#[tauri::command]
pub async fn tm_upsert_role(role: Role, pool: State<'_, MySqlPool>) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO time_management_roles (id, name, color, created_at) 
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), color = VALUES(color)"
    )
    .bind(&role.id)
    .bind(&role.name)
    .bind(&role.color)
    .bind(role.created_at)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn tm_delete_role(id: String, pool: State<'_, MySqlPool>) -> Result<(), String> {
    sqlx::query("DELETE FROM time_management_roles WHERE id = ?")
        .bind(&id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
        
    sqlx::query("UPDATE time_management_tasks SET role_id = NULL WHERE role_id = ?")
        .bind(&id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
        
    Ok(())
}

#[tauri::command]
pub async fn tm_upsert_task(task: Task, pool: State<'_, MySqlPool>) -> Result<(), String> {
    let completed_val: i8 = if task.completed { 1 } else { 0 };
    sqlx::query(
        "INSERT INTO time_management_tasks (id, title, role_id, quadrant, scheduled_date, time_of_day, completed, created_at, completed_at, description, deadline) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
            title = VALUES(title), 
            role_id = VALUES(role_id), 
            quadrant = VALUES(quadrant), 
            scheduled_date = VALUES(scheduled_date), 
            time_of_day = VALUES(time_of_day), 
            completed = VALUES(completed), 
            completed_at = VALUES(completed_at), 
            description = VALUES(description), 
            deadline = VALUES(deadline)"
    )
    .bind(&task.id)
    .bind(&task.title)
    .bind(&task.role_id)
    .bind(&task.quadrant)
    .bind(&task.scheduled_date)
    .bind(&task.time_of_day)
    .bind(completed_val)
    .bind(task.created_at)
    .bind(task.completed_at)
    .bind(&task.description)
    .bind(task.deadline)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn tm_delete_task(id: String, pool: State<'_, MySqlPool>) -> Result<(), String> {
    sqlx::query("DELETE FROM time_management_tasks WHERE id = ?")
        .bind(&id)
        .execute(&*pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}
