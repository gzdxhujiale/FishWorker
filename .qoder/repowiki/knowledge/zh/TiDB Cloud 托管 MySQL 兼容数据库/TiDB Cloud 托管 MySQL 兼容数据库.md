---
kind: external_dependency
name: TiDB Cloud 托管 MySQL 兼容数据库
slug: tidb-cloud
category: external_dependency
category_hints:
    - vendor_identity
    - client_constraint
scope:
    - '**'
---

项目使用 TiDB Cloud 作为远程 MySQL 兼容数据库，默认连接地址为 gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000，强制要求 ssl-mode=required。连接池最大连接数 5，获取超时 10 秒。配置文件 mysql.config.json 支持多路径查找（开发目录、运行目录、ProgramData/AIstudyPublicData/config、APPDATA/AIstudy），并可通过 skipSchemaCreation 跳过启动时建表。