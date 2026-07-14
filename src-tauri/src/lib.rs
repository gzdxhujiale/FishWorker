mod course;
mod db;
mod document;
mod list;
mod schema;
mod time_management;
mod daily_review;

use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            match tauri::async_runtime::block_on(async { db::establish_connection().await }) {
                Ok(pool) => {
                    app.manage(pool);
                }
                Err(e) => {
                    eprintln!("Failed to connect to MySQL database: {}", e);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            course::courses_load,
            course::course_create,
            course::course_rename,
            course::course_move,
            course::course_reorder,
            course::course_delete,
            course::section_create,
            course::section_rename,
            course::section_toggle,
            course::section_toggle_all,
            course::section_reorder,
            course::section_delete,
            course::courses_save_store,
            document::knowledge_documents_load,
            document::knowledge_documents_save,
            db::db_get_config,
            db::db_save_config,
            time_management::tm_load_all,
            time_management::tm_upsert_role,
            time_management::tm_delete_role,
            time_management::tm_upsert_task,
            time_management::tm_delete_task,
            daily_review::daily_review_load_all,
            daily_review::daily_review_save,
            daily_review::daily_review_delete,
            list::list_load_all,
            list::list_upsert_folder,
            list::list_delete_folder,
            list::list_upsert_list,
            list::list_delete_list,
            list::list_reorder_lists,
            list::list_move_list,
            list::list_duplicate_list,
            list::list_upsert_note,
            list::list_delete_note,
            list::list_move_note,
            list::list_reorder_notes,
            list::list_upsert_group,
            list::list_delete_group,
            list::list_upsert_template,
            list::list_delete_template,
            list::list_migrate_from_local
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
