package models

import (
	"time"
)

// Host 主机模型
type Host struct {
	ID          int       `json:"id" db:"id"`
	IP          string    `json:"ip" db:"ip"`
	HostGroupID int       `json:"host_group_id" db:"host_group_id"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

// HostGroup 主机组模型
type HostGroup struct {
	ID        int       `json:"id" db:"id"`
	Name      string    `json:"name" db:"name"`
	Username  string    `json:"username" db:"username"`
	Password  string    `json:"password" db:"password"`
	Port      int       `json:"port" db:"port"`   // 新增端口字段
	Hosts     string    `json:"hosts" db:"hosts"` // 保持兼容性，但逐步迁移到Host表
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// Script 脚本模型
type Script struct {
	ID          int       `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	Content     string    `json:"content" db:"content"`
	HostGroupID int       `json:"host_group_id" db:"host_group_id"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

// AnsiblePlaybook Ansible Playbook模型
type AnsiblePlaybook struct {
	ID          int       `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	Content     string    `json:"content" db:"content"`
	Variables   string    `json:"variables" db:"variables"` // YAML格式的变量
	HostGroupID int       `json:"host_group_id" db:"host_group_id"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

// ExecutionLog 执行日志模型
type ExecutionLog struct {
	ID         int       `json:"id" db:"id"`
	ScriptID   int       `json:"script_id" db:"script_id"`
	Host       string    `json:"host" db:"host"`
	Status     string    `json:"status" db:"status"` // success, failed, timeout
	Output     string    `json:"output" db:"output"`
	Error      string    `json:"error" db:"error"`
	ExecutedAt time.Time `json:"executed_at" db:"executed_at"`
}

// AnsibleExecutionLog Ansible执行日志模型
type AnsibleExecutionLog struct {
	ID         int       `json:"id" db:"id"`
	PlaybookID int       `json:"playbook_id" db:"playbook_id"`
	Host       string    `json:"host" db:"host"`
	Status     string    `json:"status" db:"status"` // success, failed, timeout
	Output     string    `json:"output" db:"output"`
	Error      string    `json:"error" db:"error"`
	ExecutedAt time.Time `json:"executed_at" db:"executed_at"`
}

// ExecutionSession 执行会话模型
type ExecutionSession struct {
	ID          int       `json:"id" db:"id"`
	ScriptID    int       `json:"script_id" db:"script_id"`
	SessionName string    `json:"session_name" db:"session_name"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

// AnsibleExecutionSession Ansible执行会话模型
type AnsibleExecutionSession struct {
	ID          int       `json:"id" db:"id"`
	PlaybookID  int       `json:"playbook_id" db:"playbook_id"`
	SessionName string    `json:"session_name" db:"session_name"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

// SystemInfo 系统信息模型
type SystemInfo struct {
	IP          string    `json:"ip"`
	Status      string    `json:"status"`
	CPUUsage    float64   `json:"cpu_usage"`
	MemoryUsage float64   `json:"memory_usage"`
	DiskUsage   float64   `json:"disk_usage"`
	NetworkTx   string    `json:"network_tx"`
	NetworkRx   string    `json:"network_rx"`
	Ports       []string  `json:"ports"`
	LastUpdated time.Time `json:"last_updated"`
}

// ProcessInfo 进程信息模型
type ProcessInfo struct {
	PID         int     `json:"pid"`
	Name        string  `json:"name"`
	Command     string  `json:"command"`
	CPUUsage    float64 `json:"cpu_usage"`
	MemoryUsage float64 `json:"memory_usage"`
	Port        string  `json:"port"`
	Host        string  `json:"host"`
}

// DeploymentTask 部署任务模型
type DeploymentTask struct {
	ID          int       `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	GithubURL   string    `json:"github_url" db:"github_url"`
	Branch      string    `json:"branch" db:"branch"`
	HostGroupID int       `json:"host_group_id" db:"host_group_id"`
	Status      string    `json:"status" db:"status"` // pending, running, success, failed
	Description string    `json:"description" db:"description"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

// DeploymentLog 部署日志模型
type DeploymentLog struct {
	ID         int       `json:"id" db:"id"`
	TaskID     int       `json:"task_id" db:"task_id"`
	Host       string    `json:"host" db:"host"`
	Status     string    `json:"status" db:"status"` // success, failed, running
	Output     string    `json:"output" db:"output"`
	Error      string    `json:"error" db:"error"`
	DeployedAt time.Time `json:"deployed_at" db:"deployed_at"`
}
