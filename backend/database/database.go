package database

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

func InitDB() {
	var err error
	DB, err = sql.Open("sqlite3", "./runme.db")
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	if err = DB.Ping(); err != nil {
		log.Fatal("Failed to ping database:", err)
	}

	createAnsibleTables()
	migrateDatabase() // 新增数据库迁移
	log.Println("Database initialized successfully")
}

func createTables() {
	// 创建主机组表
	hostGroupTable := `
	CREATE TABLE IF NOT EXISTS host_groups (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL UNIQUE,
		username TEXT NOT NULL,
		password TEXT NOT NULL,
		port INTEGER NOT NULL DEFAULT 22,
		hosts TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`

	// 创建主机表
	hostTable := `
	CREATE TABLE IF NOT EXISTS hosts (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		ip TEXT NOT NULL,
		host_group_id INTEGER NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (host_group_id) REFERENCES host_groups(id) ON DELETE CASCADE,
		UNIQUE(ip, host_group_id)
	);
	`

	// 创建脚本表
	scriptTable := `
	CREATE TABLE IF NOT EXISTS scripts (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		content TEXT NOT NULL,
		host_group_id INTEGER NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (host_group_id) REFERENCES host_groups(id)
	);
	`

	// 创建执行日志表
	executionLogTable := `
	CREATE TABLE IF NOT EXISTS execution_logs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		script_id INTEGER NOT NULL,
		host TEXT NOT NULL,
		status TEXT NOT NULL,
		output TEXT,
		error TEXT,
		executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (script_id) REFERENCES scripts(id)
	);
	`

	// 创建执行会话表
	executionSessionTable := `
	CREATE TABLE IF NOT EXISTS execution_sessions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		script_id INTEGER NOT NULL,
		session_name TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (script_id) REFERENCES scripts(id)
	);
	`

	tables := []string{hostGroupTable, hostTable, scriptTable, executionLogTable, executionSessionTable}
	for _, table := range tables {
		if _, err := DB.Exec(table); err != nil {
			log.Fatal("Failed to create table:", err)
		}
	}
}

func createAnsibleTables() {
	// 先创建原有表
	createTables()

	// 创建Ansible Playbook表
	ansiblePlaybookTable := `
	CREATE TABLE IF NOT EXISTS ansible_playbooks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		content TEXT NOT NULL,
		variables TEXT,
		host_group_id INTEGER NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (host_group_id) REFERENCES host_groups(id)
	);
	`

	// 创建Ansible执行日志表
	ansibleExecutionLogTable := `
	CREATE TABLE IF NOT EXISTS ansible_execution_logs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		playbook_id INTEGER NOT NULL,
		host TEXT NOT NULL,
		status TEXT NOT NULL,
		output TEXT,
		error TEXT,
		executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (playbook_id) REFERENCES ansible_playbooks(id)
	);
	`

	// 创建Ansible执行会话表
	ansibleExecutionSessionTable := `
	CREATE TABLE IF NOT EXISTS ansible_execution_sessions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		playbook_id INTEGER NOT NULL,
		session_name TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (playbook_id) REFERENCES ansible_playbooks(id)
	);
	`

	ansibleTables := []string{ansiblePlaybookTable, ansibleExecutionLogTable, ansibleExecutionSessionTable}
	for _, table := range ansibleTables {
		if _, err := DB.Exec(table); err != nil {
			log.Fatal("Failed to create ansible table:", err)
		}
	}
}

// 数据库迁移函数，为现有表添加端口字段
func migrateDatabase() {
	// 检查是否已存在port字段
	rows, err := DB.Query("PRAGMA table_info(host_groups)")
	if err != nil {
		log.Printf("Failed to check table info: %v", err)
		return
	}
	defer rows.Close()

	hasPortColumn := false
	for rows.Next() {
		var cid int
		var name, dataType string
		var notNull, pk int
		var defaultValue sql.NullString
		err := rows.Scan(&cid, &name, &dataType, &notNull, &defaultValue, &pk)
		if err != nil {
			continue
		}
		if name == "port" {
			hasPortColumn = true
			break
		}
	}

	// 如果不存在port字段，则添加
	if !hasPortColumn {
		_, err = DB.Exec("ALTER TABLE host_groups ADD COLUMN port INTEGER NOT NULL DEFAULT 22")
		if err != nil {
			log.Printf("Failed to add port column: %v", err)
		} else {
			log.Println("Added port column to host_groups table")
		}
	}
}
