package handlers

import (
	"fmt"
	"net/http"
	"net/url"
	"runme-backend/database"
	"runme-backend/models"
	"runme-backend/services"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// GetAnsiblePlaybooks 获取所有Ansible Playbook
func GetAnsiblePlaybooks(c *gin.Context) {
	rows, err := database.DB.Query(`
		SELECT ap.id, ap.name, ap.content, ap.variables, ap.host_group_id, ap.created_at, ap.updated_at, hg.name as host_group_name
		FROM ansible_playbooks ap
		LEFT JOIN host_groups hg ON ap.host_group_id = hg.id
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type PlaybookWithHostGroup struct {
		models.AnsiblePlaybook
		HostGroupName string `json:"host_group_name"`
	}

	var playbooks []PlaybookWithHostGroup
	for rows.Next() {
		var p PlaybookWithHostGroup
		err := rows.Scan(&p.ID, &p.Name, &p.Content, &p.Variables, &p.HostGroupID, &p.CreatedAt, &p.UpdatedAt, &p.HostGroupName)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		playbooks = append(playbooks, p)
	}

	c.JSON(http.StatusOK, playbooks)
}

// CreateAnsiblePlaybook 创建Ansible Playbook
func CreateAnsiblePlaybook(c *gin.Context) {
	var playbook models.AnsiblePlaybook
	if err := c.ShouldBindJSON(&playbook); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	playbook.CreatedAt = time.Now()
	playbook.UpdatedAt = time.Now()

	result, err := database.DB.Exec(
		"INSERT INTO ansible_playbooks (name, content, variables, host_group_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
		playbook.Name, playbook.Content, playbook.Variables, playbook.HostGroupID, playbook.CreatedAt, playbook.UpdatedAt,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	id, _ := result.LastInsertId()
	playbook.ID = int(id)
	c.JSON(http.StatusCreated, playbook)
}

// UpdateAnsiblePlaybook 更新Ansible Playbook
func UpdateAnsiblePlaybook(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid playbook ID"})
		return
	}

	var playbook models.AnsiblePlaybook
	if err := c.ShouldBindJSON(&playbook); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	playbook.UpdatedAt = time.Now()

	_, err = database.DB.Exec(
		"UPDATE ansible_playbooks SET name = ?, content = ?, variables = ?, host_group_id = ?, updated_at = ? WHERE id = ?",
		playbook.Name, playbook.Content, playbook.Variables, playbook.HostGroupID, playbook.UpdatedAt, id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	playbook.ID = id
	c.JSON(http.StatusOK, playbook)
}

// DeleteAnsiblePlaybook 删除Ansible Playbook
func DeleteAnsiblePlaybook(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid playbook ID"})
		return
	}

	_, err = database.DB.Exec("DELETE FROM ansible_playbooks WHERE id = ?", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Playbook deleted successfully"})
}

// ExecuteAnsiblePlaybook 执行Ansible Playbook
func ExecuteAnsiblePlaybook(c *gin.Context) {
	playbookID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid playbook ID"})
		return
	}

	// 获取playbook和主机组信息
	var playbook models.AnsiblePlaybook
	var hostGroup models.HostGroup
	err = database.DB.QueryRow(`
		SELECT ap.id, ap.name, ap.content, ap.variables, ap.host_group_id, hg.username, hg.password, hg.port, hg.hosts
		FROM ansible_playbooks ap
		JOIN host_groups hg ON ap.host_group_id = hg.id
		WHERE ap.id = ?
	`, playbookID).Scan(&playbook.ID, &playbook.Name, &playbook.Content, &playbook.Variables, &playbook.HostGroupID, &hostGroup.Username, &hostGroup.Password, &hostGroup.Port, &hostGroup.Hosts)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Playbook not found"})
		return
	}

	// 解析主机列表
	hosts := strings.Split(hostGroup.Hosts, "\n")
	var validHosts []string
	for _, host := range hosts {
		host = strings.TrimSpace(host)
		if host != "" {
			validHosts = append(validHosts, host)
		}
	}

	if len(validHosts) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No valid hosts found"})
		return
	}

	// 创建执行会话
	sessionName := fmt.Sprintf("%s_%d", playbook.Name, time.Now().Unix())
	_, err = database.DB.Exec(
		"INSERT INTO ansible_execution_sessions (playbook_id, session_name, created_at) VALUES (?, ?, ?)",
		playbookID, sessionName, time.Now(),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create execution session"})
		return
	}

	// 异步执行playbook
	go func() {
		for _, host := range validHosts {
			log := models.AnsibleExecutionLog{
				PlaybookID: playbookID,
				Host:       host,
				ExecutedAt: time.Now(),
			}

			// 执行Ansible playbook
			output, err := services.ExecuteAnsiblePlaybook(host, hostGroup.Username, hostGroup.Password, hostGroup.Port, playbook.Content, playbook.Variables)
			if err != nil {
				log.Status = "failed"
				log.Error = err.Error()
			} else {
				log.Status = "success"
				log.Output = output
			}

			// 保存执行日志
			_, err = database.DB.Exec(
				"INSERT INTO ansible_execution_logs (playbook_id, host, status, output, error, executed_at) VALUES (?, ?, ?, ?, ?, ?)",
				log.PlaybookID, log.Host, log.Status, log.Output, log.Error, log.ExecutedAt,
			)
			if err != nil {
				fmt.Printf("Failed to save execution log: %v\n", err)
			}
		}
	}()

	c.JSON(http.StatusOK, gin.H{"message": "Playbook execution started", "session_name": sessionName})
}

// GetAnsibleExecutionSessions 获取Ansible执行会话
func GetAnsibleExecutionSessions(c *gin.Context) {
	playbookID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid playbook ID"})
		return
	}

	rows, err := database.DB.Query(
		"SELECT id, playbook_id, session_name, created_at FROM ansible_execution_sessions WHERE playbook_id = ? ORDER BY created_at DESC",
		playbookID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var sessions []models.AnsibleExecutionSession
	for rows.Next() {
		var session models.AnsibleExecutionSession
		err := rows.Scan(&session.ID, &session.PlaybookID, &session.SessionName, &session.CreatedAt)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		sessions = append(sessions, session)
	}

	c.JSON(http.StatusOK, sessions)
}

// GetAnsibleExecutionLogs 获取Ansible执行日志
func GetAnsibleExecutionLogs(c *gin.Context) {
	playbookID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid playbook ID"})
		return
	}

	sessionName := c.Query("session_name")
	if sessionName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "session_name is required"})
		return
	}

	// URL解码
	decodedSessionName, err := url.QueryUnescape(sessionName)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid session_name encoding"})
		return
	}

	// 首先验证session是否存在
	var sessionExists bool
	err = database.DB.QueryRow(
		"SELECT EXISTS(SELECT 1 FROM ansible_execution_sessions WHERE playbook_id = ? AND session_name = ?)",
		playbookID, decodedSessionName,
	).Scan(&sessionExists)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if !sessionExists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}

	// 获取该session的所有日志
	rows, err := database.DB.Query(`
		SELECT ael.id, ael.playbook_id, ael.host, ael.status, ael.output, ael.error, ael.executed_at
		FROM ansible_execution_logs ael
		JOIN ansible_execution_sessions aes ON ael.playbook_id = aes.playbook_id
		WHERE ael.playbook_id = ? AND aes.session_name = ?
		AND ael.executed_at >= (
			SELECT created_at FROM ansible_execution_sessions 
			WHERE playbook_id = ? AND session_name = ?
		)
		ORDER BY ael.executed_at ASC
	`, playbookID, decodedSessionName, playbookID, decodedSessionName)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var logs []models.AnsibleExecutionLog
	for rows.Next() {
		var log models.AnsibleExecutionLog
		err := rows.Scan(&log.ID, &log.PlaybookID, &log.Host, &log.Status, &log.Output, &log.Error, &log.ExecutedAt)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		logs = append(logs, log)
	}

	c.JSON(http.StatusOK, logs)
}
