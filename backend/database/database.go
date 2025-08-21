package database

import (
	"database/sql"
	"log"
	"time"

	_ "github.com/mattn/go-sqlite3"
	"golang.org/x/crypto/bcrypt"
)

var DB *sql.DB

func InitDB() {
	var err error
	DB, err = sql.Open("sqlite3", "/app/data/runme.db")
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	if err = DB.Ping(); err != nil {
		log.Fatal("Failed to ping database:", err)
	}

	createAllTables()
	createDefaultAdmin() // 创建默认管理员账户
	log.Println("Database initialized successfully")
}

func createAllTables() {
	// 创建用户表
	usersTable := `
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT NOT NULL UNIQUE,
		password TEXT NOT NULL,
		email TEXT NOT NULL,
		role TEXT NOT NULL DEFAULT 'user',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`

	// 创建主机组表（简化版本，与模型匹配）
	hostGroupTable := `
	CREATE TABLE IF NOT EXISTS host_groups (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL UNIQUE,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`

	// 创建主机表（包含认证信息）
	hostTable := `
	CREATE TABLE IF NOT EXISTS hosts (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		ip TEXT NOT NULL,
		port INTEGER NOT NULL DEFAULT 22,
		username TEXT NOT NULL,
		password TEXT NOT NULL,
		host_group_id INTEGER NOT NULL,
		os_info TEXT,
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

	// 创建部署任务表
	deploymentTaskTable := `
	CREATE TABLE IF NOT EXISTS deployment_tasks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		github_url TEXT NOT NULL,
		branch TEXT NOT NULL DEFAULT 'main',
		host_group_id INTEGER NOT NULL,
		status TEXT NOT NULL DEFAULT 'pending',
		description TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (host_group_id) REFERENCES host_groups(id)
	);
	`

	// 创建部署日志表
	deploymentLogTable := `
	CREATE TABLE IF NOT EXISTS deployment_logs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		task_id INTEGER NOT NULL,
		session_name TEXT NOT NULL,
		host TEXT NOT NULL,
		status TEXT NOT NULL,
		output TEXT,
		error TEXT,
		deployed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (task_id) REFERENCES deployment_tasks(id)
	);
	`

	// 创建部署会话表
	deploymentSessionTable := `
	CREATE TABLE IF NOT EXISTS deployment_sessions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		task_id INTEGER NOT NULL,
		session_name TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (task_id) REFERENCES deployment_tasks(id)
	);
	`

	// 创建证书表
	certificateTable := `
	CREATE TABLE IF NOT EXISTS certificates (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		domain TEXT NOT NULL,
		type TEXT NOT NULL,
		status TEXT NOT NULL DEFAULT 'pending',
		auto_renew BOOLEAN NOT NULL DEFAULT 0,
		host_group_id INTEGER NOT NULL,
		deploy_path TEXT,
		email TEXT,
		cert_path TEXT,
		key_path TEXT,
		issued_at DATETIME,
		expires_at DATETIME,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (host_group_id) REFERENCES host_groups(id)
	);
	`

	// 创建证书日志表
	certificateLogTable := `
	CREATE TABLE IF NOT EXISTS certificate_logs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		certificate_id INTEGER NOT NULL,
		action TEXT NOT NULL,
		status TEXT NOT NULL,
		message TEXT,
		output TEXT,
		error TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (certificate_id) REFERENCES certificates(id)
	);
	`

	// 创建Docker模板表
	dockerTemplateTable := `
	CREATE TABLE IF NOT EXISTS docker_templates (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		docker_command TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	`

	// 按顺序创建所有表
	tables := []string{
		usersTable,
		hostGroupTable,
		hostTable,
		scriptTable,
		ansiblePlaybookTable,
		executionLogTable,
		ansibleExecutionLogTable,
		executionSessionTable,
		ansibleExecutionSessionTable,
		deploymentTaskTable,
		deploymentLogTable,
		deploymentSessionTable,
		certificateTable,
		certificateLogTable,
		dockerTemplateTable,
	}

	for _, table := range tables {
		if _, err := DB.Exec(table); err != nil {
			log.Fatal("Failed to create table:", err)
		}
	}

	log.Println("All tables created successfully")
}

// 创建默认管理员账户
func createDefaultAdmin() {
	// 检查是否已存在管理员账户
	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM users WHERE role = 'admin'").Scan(&count)
	if err != nil {
		log.Printf("Failed to check admin users: %v", err)
		return
	}

	// 如果没有管理员账户，创建默认账户
	if count == 0 {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("Failed to hash password: %v", err)
			return
		}

		_, err = DB.Exec(`
			INSERT INTO users (username, password, email, role, created_at, updated_at) 
			VALUES (?, ?, ?, ?, ?, ?)
		`, "Admin", string(hashedPassword), "admin@example.com", "admin", time.Now(), time.Now())

		if err != nil {
			log.Printf("Failed to create default admin: %v", err)
		} else {
			log.Println("Default admin user created: username=admin, password=admin123")
		}
	}
}
