use sqlx::sqlite::{SqlitePool, SqlitePoolOptions, SqliteConnectOptions};
use sqlx::MySqlPool;
use std::path::PathBuf;
use std::str::FromStr;

/// Get the local database file path under the user's AppData directory.
fn get_local_db_path() -> PathBuf {
    let app_data = std::env::var("APPDATA")
        .unwrap_or_else(|_| "C:\\Users\\Default\\AppData\\Roaming".to_string());
    let dir = PathBuf::from(app_data).join("AIstudy").join("data");
    if !dir.exists() {
        let _ = std::fs::create_dir_all(&dir);
    }
    dir.join("fishworker.db")
}

/// Establish a connection pool to the local SQLite database.
/// Creates the database file and parent directories if they don't exist.
pub async fn establish_local_connection() -> Result<SqlitePool, sqlx::Error> {
    let db_path = get_local_db_path();
    let db_url = format!("sqlite:{}?mode=rwc", db_path.display());

    let options = SqliteConnectOptions::from_str(&db_url)?
        .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
        .busy_timeout(std::time::Duration::from_secs(10))
        .create_if_missing(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await?;

    // Enable WAL mode for better concurrent read/write performance
    sqlx::query("PRAGMA journal_mode=WAL;")
        .execute(&pool)
        .await?;
    sqlx::query("PRAGMA synchronous=NORMAL;")
        .execute(&pool)
        .await?;
    sqlx::query("PRAGMA foreign_keys=ON;")
        .execute(&pool)
        .await?;

    Ok(pool)
}

/// Pull all existing user data from remote TiDB MySQL into local SQLite (safe sync migration on startup).
pub async fn pull_from_tidb(mysql: &MySqlPool, sqlite: &SqlitePool) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    use sea_orm::{EntityTrait, Set};
    use crate::entities::*;

    let db_sqlite = sea_orm::SqlxSqliteConnector::from_sqlx_sqlite_pool(sqlite.clone());
    let db_mysql = sea_orm::SqlxMySqlConnector::from_sqlx_mysql_pool(mysql.clone());

    // 1. list_folders
    if let Ok(rows) = list_folders::Entity::find().all(&db_mysql).await {
        for r in rows {
            let am = list_folders::ActiveModel {
                id: Set(r.id),
                name: Set(r.name),
                is_pinned: Set(r.is_pinned),
                sort_order: Set(r.sort_order),
                created_at: Set(r.created_at),
                updated_at: Set(r.updated_at),
                deleted_at: Set(r.deleted_at),
            };
            let _ = list_folders::Entity::insert(am)
                .on_conflict(
                    sea_orm::sea_query::OnConflict::column(list_folders::Column::Id)
                        .do_nothing()
                        .to_owned()
                )
                .exec(&db_sqlite)
                .await;
        }
    }

    // 2. list_lists
    if let Ok(rows) = list_lists::Entity::find().all(&db_mysql).await {
        for r in rows {
            let am = list_lists::ActiveModel {
                id: Set(r.id),
                name: Set(r.name),
                icon: Set(r.icon),
                color: Set(r.color),
                view_type: Set(r.view_type),
                folder_id: Set(r.folder_id),
                is_pinned: Set(r.is_pinned),
                sort_order: Set(r.sort_order),
                created_at: Set(r.created_at),
                updated_at: Set(r.updated_at),
                deleted_at: Set(r.deleted_at),
            };
            let _ = list_lists::Entity::insert(am)
                .on_conflict(
                    sea_orm::sea_query::OnConflict::column(list_lists::Column::Id)
                        .do_nothing()
                        .to_owned()
                )
                .exec(&db_sqlite)
                .await;
        }
    }

    // 3. list_note_groups
    if let Ok(rows) = list_note_groups::Entity::find().all(&db_mysql).await {
        for r in rows {
            let am = list_note_groups::ActiveModel {
                id: Set(r.id),
                list_id: Set(r.list_id),
                name: Set(r.name),
                sort_order: Set(r.sort_order),
                created_at: Set(r.created_at),
                updated_at: Set(r.updated_at),
            };
            let _ = list_note_groups::Entity::insert(am)
                .on_conflict(
                    sea_orm::sea_query::OnConflict::column(list_note_groups::Column::Id)
                        .do_nothing()
                        .to_owned()
                )
                .exec(&db_sqlite)
                .await;
        }
    }

    // 4. list_notes
    if let Ok(rows) = list_notes::Entity::find().all(&db_mysql).await {
        for r in rows {
            let am = list_notes::ActiveModel {
                id: Set(r.id),
                list_id: Set(r.list_id),
                group_id: Set(r.group_id),
                title: Set(r.title),
                content: Set(r.content),
                is_pinned: Set(r.is_pinned),
                sort_order: Set(r.sort_order),
                created_at: Set(r.created_at),
                updated_at: Set(r.updated_at),
                deleted_at: Set(r.deleted_at),
            };
            let _ = list_notes::Entity::insert(am)
                .on_conflict(
                    sea_orm::sea_query::OnConflict::column(list_notes::Column::Id)
                        .do_nothing()
                        .to_owned()
                )
                .exec(&db_sqlite)
                .await;
        }
    }

    // 5. list_templates
    if let Ok(rows) = list_templates::Entity::find().all(&db_mysql).await {
        for r in rows {
            let am = list_templates::ActiveModel {
                id: Set(r.id),
                name: Set(r.name),
                content: Set(r.content),
                created_at: Set(r.created_at),
                updated_at: Set(r.updated_at),
            };
            let _ = list_templates::Entity::insert(am)
                .on_conflict(
                    sea_orm::sea_query::OnConflict::column(list_templates::Column::Id)
                        .do_nothing()
                        .to_owned()
                )
                .exec(&db_sqlite)
                .await;
        }
    }

    // 6. daily_reviews
    if let Ok(rows) = daily_reviews::Entity::find().all(&db_mysql).await {
        for r in rows {
            let am = daily_reviews::ActiveModel {
                id: Set(r.id),
                date: Set(r.date),
                content: Set(r.content),
                rating: Set(r.rating),
                created_at: Set(r.created_at),
                updated_at: Set(r.updated_at),
            };
            let _ = daily_reviews::Entity::insert(am)
                .on_conflict(
                    sea_orm::sea_query::OnConflict::column(daily_reviews::Column::Id)
                        .do_nothing()
                        .to_owned()
                )
                .exec(&db_sqlite)
                .await;
        }
    }

    // 7. time_management_tasks
    if let Ok(rows) = time_management_tasks::Entity::find().all(&db_mysql).await {
        for r in rows {
            let am = time_management_tasks::ActiveModel {
                id: Set(r.id),
                title: Set(r.title),
                role_id: Set(r.role_id),
                quadrant: Set(r.quadrant),
                scheduled_date: Set(r.scheduled_date),
                time_of_day: Set(r.time_of_day),
                completed: Set(r.completed),
                created_at: Set(r.created_at),
                completed_at: Set(r.completed_at),
                description: Set(r.description),
                deadline: Set(r.deadline),
            };
            let _ = time_management_tasks::Entity::insert(am)
                .on_conflict(
                    sea_orm::sea_query::OnConflict::column(time_management_tasks::Column::Id)
                        .do_nothing()
                        .to_owned()
                )
                .exec(&db_sqlite)
                .await;
        }
    }

    // 8. mission_statement
    if let Ok(rows) = mission_statement::Entity::find().all(&db_mysql).await {
        for r in rows {
            let am = mission_statement::ActiveModel {
                id: Set(r.id),
                content: Set(r.content),
                updated_at: Set(r.updated_at),
            };
            let _ = mission_statement::Entity::insert(am)
                .on_conflict(
                    sea_orm::sea_query::OnConflict::column(mission_statement::Column::Id)
                        .do_nothing()
                        .to_owned()
                )
                .exec(&db_sqlite)
                .await;
        }
    }

    // 9. mission_roles
    if let Ok(rows) = mission_roles::Entity::find().all(&db_mysql).await {
        for r in rows {
            let am = mission_roles::ActiveModel {
                id: Set(r.id),
                name: Set(r.name),
                icon: Set(r.icon),
                sort_order: Set(r.sort_order),
                created_at: Set(r.created_at),
                updated_at: Set(r.updated_at),
            };
            let _ = mission_roles::Entity::insert(am)
                .on_conflict(
                    sea_orm::sea_query::OnConflict::column(mission_roles::Column::Id)
                        .do_nothing()
                        .to_owned()
                )
                .exec(&db_sqlite)
                .await;
        }
    }

    // 10. mission_goals
    if let Ok(rows) = mission_goals::Entity::find().all(&db_mysql).await {
        for r in rows {
            let am = mission_goals::ActiveModel {
                id: Set(r.id),
                role_id: Set(r.role_id),
                title: Set(r.title),
                status: Set(r.status),
                time_scope: Set(r.time_scope),
                start_date: Set(r.start_date),
                end_date: Set(r.end_date),
                sort_order: Set(r.sort_order),
                created_at: Set(r.created_at),
                updated_at: Set(r.updated_at),
            };
            let _ = mission_goals::Entity::insert(am)
                .on_conflict(
                    sea_orm::sea_query::OnConflict::column(mission_goals::Column::Id)
                        .do_nothing()
                        .to_owned()
                )
                .exec(&db_sqlite)
                .await;
        }
    }

    // 11. habits
    if let Ok(rows) = habits::Entity::find().all(&db_mysql).await {
        for r in rows {
            let am = habits::ActiveModel {
                id: Set(r.id),
                name: Set(r.name),
                frequency: Set(r.frequency),
                goal: Set(r.goal),
                start_date: Set(r.start_date),
                duration: Set(r.duration),
                category: Set(r.category),
                reminder: Set(r.reminder),
                auto_popup_log: Set(r.auto_popup_log),
                created_at: Set(r.created_at),
                updated_at: Set(r.updated_at),
            };
            let _ = habits::Entity::insert(am)
                .on_conflict(
                    sea_orm::sea_query::OnConflict::column(habits::Column::Id)
                        .do_nothing()
                        .to_owned()
                )
                .exec(&db_sqlite)
                .await;
        }
    }

    // 12. habit_checkins
    if let Ok(rows) = habit_checkins::Entity::find().all(&db_mysql).await {
        for r in rows {
            let am = habit_checkins::ActiveModel {
                id: Set(r.id),
                habit_id: Set(r.habit_id),
                date: Set(r.date),
                completed: Set(r.completed),
                created_at: Set(r.created_at),
                updated_at: Set(r.updated_at),
            };
            let _ = habit_checkins::Entity::insert(am)
                .on_conflict(
                    sea_orm::sea_query::OnConflict::column(habit_checkins::Column::Id)
                        .do_nothing()
                        .to_owned()
                )
                .exec(&db_sqlite)
                .await;
        }
    }

    // 13. pomodoro_records
    if let Ok(rows) = pomodoro_records::Entity::find().all(&db_mysql).await {
        for r in rows {
            let am = pomodoro_records::ActiveModel {
                id: Set(r.id),
                mode: Set(r.mode),
                phase: Set(r.phase),
                start_time: Set(r.start_time),
                end_time: Set(r.end_time),
                duration_minutes: Set(r.duration_minutes),
                date: Set(r.date),
                date_label: Set(r.date_label),
                time_range_label: Set(r.time_range_label),
                task_id: Set(r.task_id),
                linked_target: Set(r.linked_target),
                created_at: Set(r.created_at),
            };
            let _ = pomodoro_records::Entity::insert(am)
                .on_conflict(
                    sea_orm::sea_query::OnConflict::column(pomodoro_records::Column::Id)
                        .do_nothing()
                        .to_owned()
                )
                .exec(&db_sqlite)
                .await;
        }
    }

    // 14. pomodoro_favorites
    if let Ok(rows) = pomodoro_favorites::Entity::find().all(&db_mysql).await {
        for r in rows {
            let am = pomodoro_favorites::ActiveModel {
                id: Set(r.id),
                name: Set(r.name),
                icon: Set(r.icon),
                mode: Set(r.mode),
                duration_minutes: Set(r.duration_minutes),
                accumulated_minutes: Set(r.accumulated_minutes),
                linked_target: Set(r.linked_target),
                is_archived: Set(r.is_archived),
                created_at: Set(r.created_at),
            };
            let _ = pomodoro_favorites::Entity::insert(am)
                .on_conflict(
                    sea_orm::sea_query::OnConflict::column(pomodoro_favorites::Column::Id)
                        .do_nothing()
                        .to_owned()
                )
                .exec(&db_sqlite)
                .await;
        }
    }

    Ok(())
}





/// Push all local SQLite user data to remote TiDB MySQL (upward sync/queue flushing).
pub async fn push_to_tidb(mysql: &MySqlPool, sqlite: &SqlitePool) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    use sea_orm::{EntityTrait, Set};
    use crate::entities::*;

    let db_sqlite = sea_orm::SqlxSqliteConnector::from_sqlx_sqlite_pool(sqlite.clone());
    let db_mysql = sea_orm::SqlxMySqlConnector::from_sqlx_mysql_pool(mysql.clone());

    // 0. Process queued DELETE operations from sync_queue
    if let Ok(queue_items) = sqlx::query("SELECT id, table_name, record_id, action FROM sync_queue WHERE action = 'DELETE'")
        .fetch_all(sqlite)
        .await
    {
        use sqlx::Row;
        let safe_tables = [
            "time_management_tasks", "daily_reviews", "mission_statement",
            "mission_roles", "mission_goals", "habits", "habit_checkins",
            "pomodoro_records", "pomodoro_favorites", "list_folders",
            "list_lists", "list_notes", "list_note_groups", "list_templates"
        ];
        for row in queue_items {
            let q_id: i64 = row.try_get("id").unwrap_or_default();
            let table_name: String = row.try_get("table_name").unwrap_or_default();
            let record_id: String = row.try_get("record_id").unwrap_or_default();

            if safe_tables.contains(&table_name.as_str()) {
                let delete_sql = format!("DELETE FROM {} WHERE id = ?", table_name);
                if let Ok(_) = sqlx::query(&delete_sql).bind(&record_id).execute(mysql).await {
                    let _ = sqlx::query("DELETE FROM sync_queue WHERE id = ?").bind(q_id).execute(sqlite).await;
                }
            }
        }
    }

    // 1. list_folders
    if let Ok(folders) = list_folders::Entity::find().all(&db_sqlite).await {
        for f in folders {
            let am = list_folders::ActiveModel {
                id: Set(f.id),
                name: Set(f.name),
                is_pinned: Set(f.is_pinned),
                sort_order: Set(f.sort_order),
                created_at: Set(f.created_at),
                updated_at: Set(f.updated_at),
                deleted_at: Set(f.deleted_at),
            };
            let _ = list_folders::Entity::insert(am)
                .on_conflict(
                    sea_orm::sea_query::OnConflict::column(list_folders::Column::Id)
                        .update_column(list_folders::Column::Name)
                        .update_column(list_folders::Column::IsPinned)
                        .update_column(list_folders::Column::SortOrder)
                        .update_column(list_folders::Column::UpdatedAt)
                        .update_column(list_folders::Column::DeletedAt)
                        .to_owned()
                )
                .exec(&db_mysql)
                .await;
        }
    }

    // 2. list_lists
    if let Ok(items) = list_lists::Entity::find().all(&db_sqlite).await {
        for f in items {
            let am = list_lists::ActiveModel {
                id: Set(f.id),
                name: Set(f.name),
                icon: Set(f.icon),
                color: Set(f.color),
                view_type: Set(f.view_type),
                folder_id: Set(f.folder_id),
                is_pinned: Set(f.is_pinned),
                sort_order: Set(f.sort_order),
                created_at: Set(f.created_at),
                updated_at: Set(f.updated_at),
                deleted_at: Set(f.deleted_at),
            };
            let _ = list_lists::Entity::insert(am)
                .on_conflict(
                    sea_orm::sea_query::OnConflict::column(list_lists::Column::Id)
                        .update_column(list_lists::Column::Name)
                        .update_column(list_lists::Column::Icon)
                        .update_column(list_lists::Column::Color)
                        .update_column(list_lists::Column::ViewType)
                        .update_column(list_lists::Column::FolderId)
                        .update_column(list_lists::Column::IsPinned)
                        .update_column(list_lists::Column::SortOrder)
                        .update_column(list_lists::Column::UpdatedAt)
                        .update_column(list_lists::Column::DeletedAt)
                        .to_owned()
                )
                .exec(&db_mysql)
                .await;
        }
    }

    // 3. list_note_groups
    if let Ok(items) = list_note_groups::Entity::find().all(&db_sqlite).await {
        for f in items {
            let am = list_note_groups::ActiveModel {
                id: Set(f.id),
                list_id: Set(f.list_id),
                name: Set(f.name),
                sort_order: Set(f.sort_order),
                created_at: Set(f.created_at),
                updated_at: Set(f.updated_at),
            };
            let _ = list_note_groups::Entity::insert(am)
                .on_conflict(
                    sea_orm::sea_query::OnConflict::column(list_note_groups::Column::Id)
                        .update_column(list_note_groups::Column::Name)
                        .update_column(list_note_groups::Column::SortOrder)
                        .update_column(list_note_groups::Column::UpdatedAt)
                        .to_owned()
                )
                .exec(&db_mysql)
                .await;
        }
    }

    // 4. list_notes
    if let Ok(items) = list_notes::Entity::find().all(&db_sqlite).await {
        for f in items {
            let am = list_notes::ActiveModel {
                id: Set(f.id),
                list_id: Set(f.list_id),
                group_id: Set(f.group_id),
                title: Set(f.title),
                content: Set(f.content),
                is_pinned: Set(f.is_pinned),
                sort_order: Set(f.sort_order),
                created_at: Set(f.created_at),
                updated_at: Set(f.updated_at),
                deleted_at: Set(f.deleted_at),
            };
            let _ = list_notes::Entity::insert(am)
                .on_conflict(
                    sea_orm::sea_query::OnConflict::column(list_notes::Column::Id)
                        .update_column(list_notes::Column::GroupId)
                        .update_column(list_notes::Column::Title)
                        .update_column(list_notes::Column::Content)
                        .update_column(list_notes::Column::IsPinned)
                        .update_column(list_notes::Column::SortOrder)
                        .update_column(list_notes::Column::UpdatedAt)
                        .update_column(list_notes::Column::DeletedAt)
                        .to_owned()
                )
                .exec(&db_mysql)
                .await;
        }
    }

    // 5. list_templates
    if let Ok(items) = list_templates::Entity::find().all(&db_sqlite).await {
        for f in items {
            let am = list_templates::ActiveModel {
                id: Set(f.id),
                name: Set(f.name),
                content: Set(f.content),
                created_at: Set(f.created_at),
                updated_at: Set(f.updated_at),
            };
            let _ = list_templates::Entity::insert(am)
                .on_conflict(
                    sea_orm::sea_query::OnConflict::column(list_templates::Column::Id)
                        .update_column(list_templates::Column::Name)
                        .update_column(list_templates::Column::Content)
                        .update_column(list_templates::Column::UpdatedAt)
                        .to_owned()
                )
                .exec(&db_mysql)
                .await;
        }
    }

    // 6. daily_reviews
    if let Ok(items) = daily_reviews::Entity::find().all(&db_sqlite).await {
        for f in items {
            let am = daily_reviews::ActiveModel {
                id: Set(f.id),
                date: Set(f.date),
                content: Set(f.content),
                rating: Set(f.rating),
                created_at: Set(f.created_at),
                updated_at: Set(f.updated_at),
            };
            let _ = daily_reviews::Entity::insert(am)
                .on_conflict(
                    sea_orm::sea_query::OnConflict::column(daily_reviews::Column::Id)
                        .update_column(daily_reviews::Column::Content)
                        .update_column(daily_reviews::Column::Rating)
                        .update_column(daily_reviews::Column::UpdatedAt)
                        .to_owned()
                )
                .exec(&db_mysql)
                .await;
        }
    }

    // 7. time_management_tasks
    if let Ok(items) = time_management_tasks::Entity::find().all(&db_sqlite).await {
        for f in items {
            let am = time_management_tasks::ActiveModel {
                id: Set(f.id),
                title: Set(f.title),
                role_id: Set(f.role_id),
                quadrant: Set(f.quadrant),
                scheduled_date: Set(f.scheduled_date),
                time_of_day: Set(f.time_of_day),
                completed: Set(f.completed),
                created_at: Set(f.created_at),
                completed_at: Set(f.completed_at),
                description: Set(f.description),
                deadline: Set(f.deadline),
            };
            let _ = time_management_tasks::Entity::insert(am)
                .on_conflict(
                    sea_orm::sea_query::OnConflict::column(time_management_tasks::Column::Id)
                        .update_column(time_management_tasks::Column::Title)
                        .update_column(time_management_tasks::Column::RoleId)
                        .update_column(time_management_tasks::Column::Quadrant)
                        .update_column(time_management_tasks::Column::ScheduledDate)
                        .update_column(time_management_tasks::Column::TimeOfDay)
                        .update_column(time_management_tasks::Column::Completed)
                        .update_column(time_management_tasks::Column::CompletedAt)
                        .update_column(time_management_tasks::Column::Description)
                        .update_column(time_management_tasks::Column::Deadline)
                        .to_owned()
                )
                .exec(&db_mysql)
                .await;
        }
    }

    // 8. mission_statement
    if let Ok(items) = mission_statement::Entity::find().all(&db_sqlite).await {
        for f in items {
            let am = mission_statement::ActiveModel {
                id: Set(f.id),
                content: Set(f.content),
                updated_at: Set(f.updated_at),
            };
            let _ = mission_statement::Entity::insert(am)
                .on_conflict(
                    sea_orm::sea_query::OnConflict::column(mission_statement::Column::Id)
                        .update_column(mission_statement::Column::Content)
                        .update_column(mission_statement::Column::UpdatedAt)
                        .to_owned()
                )
                .exec(&db_mysql)
                .await;
        }
    }

    // 9. mission_roles
    if let Ok(items) = mission_roles::Entity::find().all(&db_sqlite).await {
        for f in items {
            let am = mission_roles::ActiveModel {
                id: Set(f.id),
                name: Set(f.name),
                icon: Set(f.icon),
                sort_order: Set(f.sort_order),
                created_at: Set(f.created_at),
                updated_at: Set(f.updated_at),
            };
            let _ = mission_roles::Entity::insert(am)
                .on_conflict(
                    sea_orm::sea_query::OnConflict::column(mission_roles::Column::Id)
                        .update_column(mission_roles::Column::Name)
                        .update_column(mission_roles::Column::Icon)
                        .update_column(mission_roles::Column::SortOrder)
                        .update_column(mission_roles::Column::UpdatedAt)
                        .to_owned()
                )
                .exec(&db_mysql)
                .await;
        }
    }

    // 10. mission_goals
    if let Ok(items) = mission_goals::Entity::find().all(&db_sqlite).await {
        for f in items {
            let am = mission_goals::ActiveModel {
                id: Set(f.id),
                role_id: Set(f.role_id),
                title: Set(f.title),
                status: Set(f.status),
                time_scope: Set(f.time_scope),
                start_date: Set(f.start_date),
                end_date: Set(f.end_date),
                sort_order: Set(f.sort_order),
                created_at: Set(f.created_at),
                updated_at: Set(f.updated_at),
            };
            let _ = mission_goals::Entity::insert(am)
                .on_conflict(
                    sea_orm::sea_query::OnConflict::column(mission_goals::Column::Id)
                        .update_column(mission_goals::Column::Title)
                        .update_column(mission_goals::Column::Status)
                        .update_column(mission_goals::Column::TimeScope)
                        .update_column(mission_goals::Column::StartDate)
                        .update_column(mission_goals::Column::EndDate)
                        .update_column(mission_goals::Column::SortOrder)
                        .update_column(mission_goals::Column::UpdatedAt)
                        .to_owned()
                )
                .exec(&db_mysql)
                .await;
        }
    }

    // 11. habits
    if let Ok(items) = habits::Entity::find().all(&db_sqlite).await {
        for f in items {
            let am = habits::ActiveModel {
                id: Set(f.id),
                name: Set(f.name),
                frequency: Set(f.frequency),
                goal: Set(f.goal),
                start_date: Set(f.start_date),
                duration: Set(f.duration),
                category: Set(f.category),
                reminder: Set(f.reminder),
                auto_popup_log: Set(f.auto_popup_log),
                created_at: Set(f.created_at),
                updated_at: Set(f.updated_at),
            };
            let _ = habits::Entity::insert(am)
                .on_conflict(
                    sea_orm::sea_query::OnConflict::column(habits::Column::Id)
                        .update_column(habits::Column::Name)
                        .update_column(habits::Column::Frequency)
                        .update_column(habits::Column::Goal)
                        .update_column(habits::Column::StartDate)
                        .update_column(habits::Column::Duration)
                        .update_column(habits::Column::Category)
                        .update_column(habits::Column::Reminder)
                        .update_column(habits::Column::AutoPopupLog)
                        .update_column(habits::Column::UpdatedAt)
                        .to_owned()
                )
                .exec(&db_mysql)
                .await;
        }
    }

    // 12. habit_checkins
    if let Ok(items) = habit_checkins::Entity::find().all(&db_sqlite).await {
        for f in items {
            let am = habit_checkins::ActiveModel {
                id: Set(f.id),
                habit_id: Set(f.habit_id),
                date: Set(f.date),
                completed: Set(f.completed),
                created_at: Set(f.created_at),
                updated_at: Set(f.updated_at),
            };
            let _ = habit_checkins::Entity::insert(am)
                .on_conflict(
                    sea_orm::sea_query::OnConflict::column(habit_checkins::Column::Id)
                        .update_column(habit_checkins::Column::Completed)
                        .update_column(habit_checkins::Column::UpdatedAt)
                        .to_owned()
                )
                .exec(&db_mysql)
                .await;
        }
    }

    // 13. pomodoro_records
    if let Ok(items) = pomodoro_records::Entity::find().all(&db_sqlite).await {
        for f in items {
            let am = pomodoro_records::ActiveModel {
                id: Set(f.id),
                mode: Set(f.mode),
                phase: Set(f.phase),
                start_time: Set(f.start_time),
                end_time: Set(f.end_time),
                duration_minutes: Set(f.duration_minutes),
                date: Set(f.date),
                date_label: Set(f.date_label),
                time_range_label: Set(f.time_range_label),
                task_id: Set(f.task_id),
                linked_target: Set(f.linked_target),
                created_at: Set(f.created_at),
            };
            let _ = pomodoro_records::Entity::insert(am)
                .on_conflict(
                    sea_orm::sea_query::OnConflict::column(pomodoro_records::Column::Id)
                        .update_column(pomodoro_records::Column::Mode)
                        .update_column(pomodoro_records::Column::Phase)
                        .update_column(pomodoro_records::Column::StartTime)
                        .update_column(pomodoro_records::Column::EndTime)
                        .update_column(pomodoro_records::Column::DurationMinutes)
                        .update_column(pomodoro_records::Column::Date)
                        .update_column(pomodoro_records::Column::DateLabel)
                        .update_column(pomodoro_records::Column::TimeRangeLabel)
                        .update_column(pomodoro_records::Column::TaskId)
                        .update_column(pomodoro_records::Column::LinkedTarget)
                        .to_owned()
                )
                .exec(&db_mysql)
                .await;
        }
    }

    // 14. pomodoro_favorites
    if let Ok(items) = pomodoro_favorites::Entity::find().all(&db_sqlite).await {
        for f in items {
            let am = pomodoro_favorites::ActiveModel {
                id: Set(f.id),
                name: Set(f.name),
                icon: Set(f.icon),
                mode: Set(f.mode),
                duration_minutes: Set(f.duration_minutes),
                accumulated_minutes: Set(f.accumulated_minutes),
                linked_target: Set(f.linked_target),
                is_archived: Set(f.is_archived),
                created_at: Set(f.created_at),
            };
            let _ = pomodoro_favorites::Entity::insert(am)
                .on_conflict(
                    sea_orm::sea_query::OnConflict::column(pomodoro_favorites::Column::Id)
                        .update_column(pomodoro_favorites::Column::Name)
                        .update_column(pomodoro_favorites::Column::Icon)
                        .update_column(pomodoro_favorites::Column::Mode)
                        .update_column(pomodoro_favorites::Column::DurationMinutes)
                        .update_column(pomodoro_favorites::Column::AccumulatedMinutes)
                        .update_column(pomodoro_favorites::Column::LinkedTarget)
                        .update_column(pomodoro_favorites::Column::IsArchived)
                        .to_owned()
                )
                .exec(&db_mysql)
                .await;
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    //! C1 seam tests: verify the TiDB (cloud) → SQLite (local) pull chain for
    //! every core module.
    //!
    //! These are INTEGRATION tests: they connect to the real remote TiDB using
    //! the same config path the app uses (`crate::db::establish_connection`),
    //! pull into a throwaway in-memory SQLite, and assert the data arrived.
    //! The pull is read-only on TiDB (only SELECTs), so it is non-destructive.
    //!
    //! Run with:  cargo test --manifest-path src-tauri/Cargo.toml pull_from_tidb
    use super::*;
    use sqlx::Row;
    use sqlx::sqlite::SqlitePoolOptions;

    /// The tables `pull_from_tidb` is responsible for copying, labelled by the
    /// owning module. NOTE: pomodoro has no TiDB tables (local-only), and
    /// `time_management_roles` is intentionally absent from `pull_from_tidb`
    /// even though it exists in TiDB — both are known gaps, not tested here.
    const PULLED_TABLES: &[(&str, &str)] = &[
        ("lists / folders", "list_folders"),
        ("lists / lists", "list_lists"),
        ("lists / note_groups", "list_note_groups"),
        ("lists / notes", "list_notes"),
        ("templates", "list_templates"),
        ("daily-review", "daily_reviews"),
        ("time-management / tasks", "time_management_tasks"),
        ("mission / statement", "mission_statement"),
        ("mission / roles", "mission_roles"),
        ("mission / goals", "mission_goals"),
        ("habit / habits", "habits"),
        ("habit / checkins", "habit_checkins"),
        ("pomodoro / records", "pomodoro_records"),
        ("pomodoro / favorites", "pomodoro_favorites"),
    ];

    /// Fresh in-memory SQLite with the full local schema applied.
    /// `max_connections(1)` keeps the whole test on a single in-memory DB
    /// (each SQLite `:memory:` connection would otherwise be its own empty DB).
    async fn setup_sqlite() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("create in-memory SQLite");
        crate::local_schema::ensure_local_tables(&pool)
            .await
            .expect("ensure local SQLite tables");
        pool
    }

    async fn connect_tidb() -> Option<MySqlPool> {
        let mysql = crate::db::establish_connection().await.ok()?;
        if sqlx::query("SELECT 1").execute(&mysql).await.is_err() {
            eprintln!("skip: TiDB unreachable (network timeout or offline)");
            return None;
        }
        Some(mysql)
    }

    async fn mysql_count(mysql: &MySqlPool, table: &str) -> i64 {
        let row = sqlx::query(&format!("SELECT COUNT(*) AS c FROM {}", table))
            .fetch_one(mysql)
            .await
            .unwrap_or_else(|e| panic!("count TiDB.{}: {}", table, e));
        row.try_get::<i64, _>("c").unwrap()
    }

    async fn sqlite_count(sqlite: &SqlitePool, table: &str) -> i64 {
        let row = sqlx::query(&format!("SELECT COUNT(*) AS c FROM {}", table))
            .fetch_one(sqlite)
            .await
            .unwrap_or_else(|e| panic!("count SQLite.{}: {}", table, e));
        row.try_get::<i64, _>("c").unwrap()
    }

    /// Every module's rows must land in SQLite after a pull. Oracle = the row
    /// count read straight from TiDB, computed independently of the pull logic.
    /// A shortfall means that module's cloud→local link is broken (a per-table
    /// error swallowed inside `pull_from_tidb`).
    #[tokio::test]
    async fn pull_from_tidb_syncs_every_module_table() {
        let Some(mysql) = connect_tidb().await else {
            eprintln!("skip: TiDB unreachable");
            return;
        };
        let sqlite = setup_sqlite().await;

        pull_from_tidb(&mysql, &sqlite)
            .await
            .expect("pull_from_tidb returned Err");

        let mut report = Vec::new();
        let mut broken = Vec::new();
        for (module, table) in PULLED_TABLES {
            let src = mysql_count(&mysql, table).await;
            let dst = sqlite_count(&sqlite, table).await;
            let status = if dst == src { "OK" } else { "MISMATCH" };
            report.push(format!(
                "  {:<24} TiDB={:<6} SQLite={:<6} {}",
                module, src, dst, status
            ));
            if dst != src {
                broken.push(format!(
                    "{} ({}): TiDB has {} rows, SQLite got {}",
                    module, table, src, dst
                ));
            }
        }

        println!("\n── TiDB→SQLite pull chain report ──\n{}", report.join("\n"));

        assert!(
            broken.is_empty(),
            "Broken cloud→local link for {} module table(s):\n{}",
            broken.len(),
            broken.join("\n")
        );
    }

    /// Field-level fidelity on a representative table, so a matching row COUNT
    /// can't mask garbled column mapping. Oracle = a row read straight from TiDB.
    #[tokio::test]
    async fn pull_from_tidb_preserves_mission_role_fields() {
        let Some(mysql) = connect_tidb().await else {
            eprintln!("skip: TiDB unreachable");
            return;
        };
        let sqlite = setup_sqlite().await;

        let src = sqlx::query("SELECT id, name FROM mission_roles LIMIT 1")
            .fetch_optional(&mysql)
            .await
            .expect("query TiDB mission_roles");
        let Some(src) = src else {
            eprintln!("skip: TiDB.mission_roles is empty, nothing to verify");
            return;
        };
        let src_id: String = src.try_get("id").unwrap();
        let src_name: String = src.try_get("name").unwrap();

        pull_from_tidb(&mysql, &sqlite).await.expect("pull_from_tidb returned Err");

        let dst = sqlx::query("SELECT name FROM mission_roles WHERE id = ?")
            .bind(&src_id)
            .fetch_one(&sqlite)
            .await
            .expect("role present in TiDB should exist in SQLite after pull");
        let dst_name: String = dst.try_get("name").unwrap();
        assert_eq!(dst_name, src_name, "mission_roles.name was mangled during pull");
    }

    #[tokio::test]
    #[ignore]
    async fn test_push_to_tidb_execution() {
        let Some(mysql) = connect_tidb().await else {
            eprintln!("skip: TiDB unreachable");
            return;
        };
        let sqlite = setup_sqlite().await;

        let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        let test_id = format!("test-push-{}", uuid::Uuid::new_v4());
        let _ = sqlx::query("INSERT INTO list_folders (id, name, is_pinned, sort_order, created_at, updated_at) VALUES (?, ?, 0, 999, ?, ?)")
            .bind(&test_id)
            .bind("Push Test Folder")
            .bind(&now)
            .bind(&now)
            .execute(&sqlite)
            .await;

        push_to_tidb(&mysql, &sqlite).await.expect("push_to_tidb execution should succeed");

        let row = sqlx::query("SELECT name FROM list_folders WHERE id = ?")
            .bind(&test_id)
            .fetch_optional(&mysql)
            .await
            .expect("query TiDB for pushed folder");

        assert!(row.is_some(), "Pushed folder should exist in TiDB");
        let name: String = row.unwrap().try_get("name").unwrap();
        assert_eq!(name, "Push Test Folder");

        let _ = sqlx::query("DELETE FROM list_folders WHERE id = ?").bind(&test_id).execute(&mysql).await;
        let _ = sqlx::query("DELETE FROM list_folders WHERE id = ?").bind(&test_id).execute(&sqlite).await;

        let tidb_state = crate::db::TidbState(std::sync::Arc::new(tokio::sync::RwLock::new(Some(mysql))));
        crate::db::trigger_background_push(&tidb_state, sqlite);
    }
}

