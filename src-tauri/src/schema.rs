use sqlx::MySqlPool;

pub async fn ensure_tables(pool: &MySqlPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS course_management_courses (
            id VARCHAR(64) NOT NULL,
            name VARCHAR(120) NOT NULL,
            description TEXT NOT NULL,
            section_id VARCHAR(64) NULL,
            last_workspace_mode VARCHAR(16) NOT NULL DEFAULT 'mindmap',
            sort_order INT NOT NULL DEFAULT 0,
            created_at DATETIME(3) NOT NULL,
            updated_at DATETIME(3) NOT NULL,
            deleted_at DATETIME(3) NULL,
            PRIMARY KEY (id),
            KEY idx_section_order (section_id, sort_order),
            KEY idx_updated_at (updated_at),
            KEY idx_name (name),
            KEY idx_course_live_order (deleted_at, section_id, sort_order, updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ).execute(pool).await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS knowledge_sections (
            id VARCHAR(64) NOT NULL,
            name VARCHAR(120) NOT NULL,
            sort_order INT NOT NULL DEFAULT 0,
            collapsed TINYINT(1) NOT NULL DEFAULT 0,
            created_at DATETIME(3) NOT NULL,
            updated_at DATETIME(3) NOT NULL,
            deleted_at DATETIME(3) NULL,
            PRIMARY KEY (id),
            KEY idx_section_order (sort_order),
            KEY idx_section_name (name),
            KEY idx_section_live_order (deleted_at, sort_order, updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ).execute(pool).await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS mind_maps (
            id VARCHAR(64) NOT NULL,
            course_id VARCHAR(64) NOT NULL,
            title VARCHAR(255) NOT NULL,
            root_node_id VARCHAR(96) NOT NULL,
            current_snapshot_id VARCHAR(64) NULL,
            node_count INT NOT NULL DEFAULT 0,
            created_at DATETIME(3) NOT NULL,
            updated_at DATETIME(3) NOT NULL,
            deleted_at DATETIME(3) NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uk_course_map (course_id, id),
            KEY idx_course_updated (course_id, updated_at),
            KEY idx_deleted_at (deleted_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ).execute(pool).await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS mind_map_snapshots (
            id VARCHAR(64) NOT NULL,
            mind_map_id VARCHAR(64) NOT NULL,
            sequence_no BIGINT NOT NULL,
            schema_version INT NOT NULL,
            editor VARCHAR(64) NOT NULL,
            editor_version VARCHAR(64) NULL,
            payload_json LONGTEXT NOT NULL,
            payload_hash CHAR(64) NOT NULL,
            byte_size INT NOT NULL,
            created_at DATETIME(3) NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uk_map_sequence (mind_map_id, sequence_no),
            KEY idx_map_created (mind_map_id, created_at),
            KEY idx_payload_hash (payload_hash)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ).execute(pool).await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS knowledge_documents (
            id VARCHAR(64) NOT NULL,
            course_id VARCHAR(64) NOT NULL,
            mind_map_id VARCHAR(64) NOT NULL,
            node_id VARCHAR(96) NOT NULL,
            title VARCHAR(255) NOT NULL,
            current_snapshot_id VARCHAR(64) NULL,
            current_byte_size INT NOT NULL DEFAULT 0,
            has_content TINYINT(1) NOT NULL DEFAULT 0,
            created_at DATETIME(3) NOT NULL,
            updated_at DATETIME(3) NOT NULL,
            deleted_at DATETIME(3) NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uk_doc_node (course_id, mind_map_id, node_id),
            KEY idx_doc_node_lookup (mind_map_id, node_id, deleted_at),
            KEY idx_doc_course_updated (course_id, updated_at),
            KEY idx_doc_current_snapshot (current_snapshot_id),
            KEY idx_doc_content_lookup (course_id, mind_map_id, has_content, deleted_at),
            KEY idx_doc_deleted_at (deleted_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ).execute(pool).await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS knowledge_document_snapshots (
            id VARCHAR(64) NOT NULL,
            document_id VARCHAR(64) NOT NULL,
            sequence_no BIGINT NOT NULL,
            schema_version INT NOT NULL,
            editor VARCHAR(64) NOT NULL,
            editor_version VARCHAR(64) NULL,
            payload_json LONGTEXT NOT NULL,
            payload_hash CHAR(64) NOT NULL,
            byte_size INT NOT NULL,
            created_at DATETIME(3) NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uk_doc_sequence (document_id, sequence_no),
            KEY idx_doc_created (document_id, created_at),
            KEY idx_doc_hash (payload_hash),
            KEY idx_doc_size (byte_size)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ).execute(pool).await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS time_management_roles (
            id VARCHAR(36) NOT NULL,
            name VARCHAR(255) NOT NULL,
            color VARCHAR(50),
            created_at BIGINT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ).execute(pool).await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS time_management_tasks (
            id VARCHAR(36) NOT NULL,
            title VARCHAR(255) NOT NULL,
            role_id VARCHAR(36) NULL,
            quadrant VARCHAR(10) NOT NULL,
            scheduled_date VARCHAR(20) NULL,
            time_of_day VARCHAR(20) NULL,
            completed TINYINT(1) NOT NULL DEFAULT 0,
            created_at BIGINT NOT NULL,
            completed_at BIGINT NULL,
            description TEXT NULL,
            deadline BIGINT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ).execute(pool).await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS daily_reviews (
            id VARCHAR(64) NOT NULL,
            date DATE NOT NULL,
            content LONGTEXT NOT NULL,
            rating INT,
            created_at DATETIME(3) NOT NULL,
            updated_at DATETIME(3) NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uk_date (date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ).execute(pool).await?;

    Ok(())
}
