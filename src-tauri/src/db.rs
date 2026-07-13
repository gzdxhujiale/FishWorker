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

    let host = config.host.unwrap_or_else(|| "127.0.0.1".to_string());
    let port = config.port.unwrap_or(3306);
    let user = config.user.unwrap_or_else(|| "root".to_string());
    let password = config.password.unwrap_or_else(|| "".to_string());
    let database = config
        .database
        .unwrap_or_else(|| "aistudy_public".to_string());

    let url = format!(
        "mysql://{}:{}@{}:{}/{}",
        user, password, host, port, database
    );

    let pool = MySqlPoolOptions::new()
        .max_connections(5)
        .connect(&url)
        .await?;

    if !config.skip_schema_creation.unwrap_or(false) {
        crate::schema::ensure_tables(&pool).await?;
    }

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
