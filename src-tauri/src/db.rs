use serde::{Deserialize, Serialize};
use sqlx::mysql::{MySqlPool, MySqlPoolOptions};
use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Default, Debug, Clone)]
pub struct MysqlConfigJson {
    pub host: Option<String>,
    pub port: Option<u16>,
    pub user: Option<String>,
    pub password: Option<String>,
    pub database: Option<String>,
    #[serde(rename = "skipSchemaCreation")]
    pub skip_schema_creation: Option<bool>,
}

fn get_program_data_path() -> PathBuf {
    PathBuf::from(std::env::var("ProgramData").unwrap_or_else(|_| "C:\\ProgramData".to_string()))
}

fn get_app_data_path() -> PathBuf {
    PathBuf::from(std::env::var("APPDATA").unwrap_or_else(|_| "C:\\Users\\Default\\AppData\\Roaming".to_string()))
}

fn read_config() -> MysqlConfigJson {
    let paths = vec![
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("mysql.config.json"),
        std::env::current_dir()
            .unwrap_or_default()
            .join("src-tauri")
            .join("mysql.config.json"),
        std::env::current_dir()
            .unwrap_or_default()
            .join("mysql.config.json"),
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.join("mysql.config.json")))
            .unwrap_or_default(),
        get_program_data_path()
            .join("AIstudyPublicData")
            .join("config")
            .join("mysql.config.json"),
        get_program_data_path()
            .join("AIstudyUserData")
            .join("mysql.config.json"),
        get_app_data_path()
            .join("AIstudy")
            .join("mysql.config.json"),
    ];

    for path in paths {
        if path.exists() {
            if let Ok(content) = fs::read_to_string(&path) {
                if let Ok(config) = serde_json::from_str::<MysqlConfigJson>(&content) {
                    return config;
                }
            }
        }
    }
    MysqlConfigJson::default()
}

pub async fn establish_connection() -> Result<MySqlPool, sqlx::Error> {
    let config = read_config();

    let host = config.host.unwrap_or_else(|| "gateway01.ap-southeast-1.prod.aws.tidbcloud.com".to_string());
    let port = config.port.unwrap_or(4000);
    let user = config.user.unwrap_or_else(|| "24LcgDNkgTvCTPz.root".to_string());
    let password = config.password.unwrap_or_else(|| "4DpLYsXL6brv1phl".to_string());
    let database = config
        .database
        .unwrap_or_else(|| "aistudy_public".to_string());

    let url = format!(
        "mysql://{}:{}@{}:{}/{}?ssl-mode=required",
        user, password, host, port, database
    );

    let pool = MySqlPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(std::time::Duration::from_secs(10))
        .connect_lazy(&url)?;

    let pool_clone = pool.clone();
    let skip_schema_creation = config.skip_schema_creation.unwrap_or(false);
    tokio::spawn(async move {
        if !skip_schema_creation {
            if let Err(e) = crate::schema::ensure_tables(&pool_clone).await {
                eprintln!("Failed to ensure tables in background: {}", e);
            }
        }
    });

    Ok(pool)
}

fn get_config_write_path() -> PathBuf {
    let mut path = get_app_data_path();
    path.push("AIstudy");
    if !path.exists() {
        let _ = fs::create_dir_all(&path);
    }
    path.push("mysql.config.json");
    path
}

#[tauri::command]
pub async fn db_get_config() -> Result<MysqlConfigJson, String> {
    Ok(read_config())
}

#[tauri::command]
pub async fn db_save_config(config: MysqlConfigJson) -> Result<(), String> {
    let path = get_config_write_path();
    let content = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn db_get_preference(key: String, pool: tauri::State<'_, MySqlPool>) -> Result<Option<String>, String> {
    use sqlx::Row;
    let row = sqlx::query("SELECT pref_value FROM app_preferences WHERE pref_key = ?")
        .bind(key)
        .fetch_optional(&*pool)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(r) = row {
        let val: String = r.try_get("pref_value").unwrap_or_default();
        Ok(Some(val))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn db_set_preference(key: String, value: String, pool: tauri::State<'_, MySqlPool>) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO app_preferences (pref_key, pref_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE pref_value = ?"
    )
    .bind(key.clone())
    .bind(value.clone())
    .bind(value)
    .execute(&*pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}
