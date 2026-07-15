mod db;
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

#[tauri::command]
fn pick_markdown_file() -> Result<String, String> {
    let file_path = rfd::FileDialog::new()
        .add_filter("Markdown", &["md"])
        .pick_file();

    if let Some(path) = file_path {
        std::fs::read_to_string(path).map_err(|e| e.to_string())
    } else {
        Err("No file selected".to_string())
    }
}

#[tauri::command]
fn save_markdown_file(default_name: String, content: String) -> Result<(), String> {
    let file_path = rfd::FileDialog::new()
        .set_file_name(&default_name)
        .add_filter("Markdown", &["md"])
        .save_file();

    if let Some(path) = file_path {
        std::fs::write(path, content).map_err(|e| e.to_string())
    } else {
        Err("Save cancelled".to_string())
    }
}

#[derive(serde::Serialize, serde::Deserialize)]
struct MarkdownFile {
    title: String,
    content: String,
}

#[tauri::command]
fn pick_multiple_markdown_files() -> Result<Vec<MarkdownFile>, String> {
    let files = rfd::FileDialog::new()
        .add_filter("Markdown", &["md"])
        .pick_files();

    if let Some(paths) = files {
        let mut result = Vec::new();
        for path in paths {
            if let Some(filename) = path.file_stem().and_then(|s| s.to_str()) {
                if let Ok(content) = std::fs::read_to_string(&path) {
                    result.push(MarkdownFile {
                        title: filename.to_string(),
                        content,
                    });
                }
            }
        }
        Ok(result)
    } else {
        Err("No files selected".to_string())
    }
}

#[tauri::command]
fn save_multiple_markdown_files(files: Vec<MarkdownFile>) -> Result<(), String> {
    let folder = rfd::FileDialog::new().pick_folder();
    if let Some(dir) = folder {
        for file in files {
            // Sanitize filename to avoid invalid characters
            let sanitized_title: String = file.title
                .chars()
                .map(|c| if c.is_alphanumeric() || c == ' ' || c == '_' || c == '-' { c } else { '_' })
                .collect();
            
            let mut target_path = dir.join(format!("{}.md", sanitized_title));
            let mut counter = 1;
            while target_path.exists() {
                target_path = dir.join(format!("{}_{}.md", sanitized_title, counter));
                counter += 1;
            }

            std::fs::write(&target_path, file.content).map_err(|e| e.to_string())?;
        }
        Ok(())
    } else {
        Err("Save cancelled".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
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
            pick_markdown_file,
            save_markdown_file,
            pick_multiple_markdown_files,
            save_multiple_markdown_files,
            db::db_get_config,
            db::db_save_config,
            db::db_get_preference,
            db::db_set_preference,
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
            list::list_reorder_folders,
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
