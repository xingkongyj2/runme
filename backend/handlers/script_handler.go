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

// GetScripts 获取所有脚本
func GetScripts(c *gin.Context) {
	rows, err := database.DB.Query(`
		SELECT s.id, s.name, s.content, s.host_group_id, s.created_at, s.updated_at, hg.name as host_group_name
		FROM scripts s
		LEFT JOIN host_groups hg ON s.host_group_id = hg.id
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type ScriptWithHostGroup struct {
		models.Script
		HostGroupName string `json:"host_group_name"`
	}

	var scripts []ScriptWithHostGroup
	for rows.Next() {
		var s ScriptWithHostGroup
		err := rows.Scan(&s.ID, &s.Name, &s.Content, &s.HostGroupID, &s.CreatedAt, &s.UpdatedAt, &s.HostGroupName)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		scripts = append(scripts, s)
	}

	c.JSON(http.StatusOK, scripts)
}

// CreateScript 创建脚本
func CreateScript(c *gin.Context) {
	var script models.Script
	if err := c.ShouldBindJSON(&script); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	script.CreatedAt = time.Now()
	script.UpdatedAt = time.Now()

	result, err := database.DB.Exec(
		"INSERT INTO scripts (name, content, host_group_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
		script.Name, script.Content, script.HostGroupID, script.CreatedAt, script.UpdatedAt,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	id, _ := result.LastInsertId()
	script.ID = int(id)
	c.JSON(http.StatusCreated, script)
}

// ExecuteScript 执行脚本
func ExecuteScript(c *gin.Context) {
	scriptID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid script ID"})
		return
	}

	// 获取脚本和主机组信息
	var script models.Script
	var hostGroup models.HostGroup
	err = database.DB.QueryRow(`
		SELECT s.id, s.name, s.content, s.host_group_id, hg.username, hg.password, hg.hosts
		FROM scripts s
		JOIN host_groups hg ON s.host_group_id = hg.id
		WHERE s.id = ?
	`, scriptID).Scan(&script.ID, &script.Name, &script.Content, &script.HostGroupID, &hostGroup.Username, &hostGroup.Password, &hostGroup.Hosts)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Script not found"})
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
	sessionName := fmt.Sprintf("%s_%s", script.Name, time.Now().Format("2006-01-02_15:04:05"))
	sessionResult, err := database.DB.Exec(
		"INSERT INTO execution_sessions (script_id, session_name, created_at) VALUES (?, ?, ?)",
		scriptID, sessionName, time.Now(),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create execution session"})
		return
	}

	// 执行脚本
	fmt.Printf("[DEBUG] Starting script execution on %d hosts\n", len(validHosts))
	for i, host := range validHosts {
		fmt.Printf("[DEBUG] Host %d: %s\n", i, host)
	}

	results := services.ExecuteScriptOnHosts(validHosts, hostGroup.Username, hostGroup.Password, script.Content)
	fmt.Printf("[DEBUG] Script execution completed, got %d results\n", len(results))

	// 保存执行日志
	for i, result := range results {
		fmt.Printf("[DEBUG] Result %d: Host=%s, Status=%s, Output=%s, Error=%s\n",
			i, result.Host, result.Status, result.Output, result.Error)

		_, err := database.DB.Exec(
			"INSERT INTO execution_logs (script_id, host, status, output, error, executed_at) VALUES (?, ?, ?, ?, ?, ?)",
			scriptID, result.Host, result.Status, result.Output, result.Error, time.Now(),
		)
		if err != nil {
			fmt.Printf("[DEBUG] Failed to save execution log for host %s: %v\n", result.Host, err)
		} else {
			fmt.Printf("[DEBUG] Successfully saved log for host %s\n", result.Host)
		}
	}

	sessionID, _ := sessionResult.LastInsertId()
	fmt.Printf("[DEBUG] Returning response with sessionID: %d, sessionName: %s\n", sessionID, sessionName)

	c.JSON(http.StatusOK, gin.H{
		"session_id":   sessionID,
		"session_name": sessionName,
		"results":      results,
	})
}

// GetExecutionSessions 获取脚本的执行会话列表
func GetExecutionSessions(c *gin.Context) {
	scriptID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid script ID"})
		return
	}

	fmt.Printf("[DEBUG] GetExecutionSessions - scriptID: %d\n", scriptID)

	rows, err := database.DB.Query(
		"SELECT id, script_id, session_name, created_at FROM execution_sessions WHERE script_id = ? ORDER BY created_at DESC",
		scriptID,
	)
	if err != nil {
		fmt.Printf("[DEBUG] Query sessions error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var sessions []models.ExecutionSession
	for rows.Next() {
		var session models.ExecutionSession
		err := rows.Scan(&session.ID, &session.ScriptID, &session.SessionName, &session.CreatedAt)
		if err != nil {
			fmt.Printf("[DEBUG] Session scan error: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		sessions = append(sessions, session)
	}

	fmt.Printf("[DEBUG] Found %d sessions\n", len(sessions))
	for i, session := range sessions {
		fmt.Printf("[DEBUG] Session %d: ID=%d, Name=%s, CreatedAt=%v\n",
			i, session.ID, session.SessionName, session.CreatedAt)
	}

	c.JSON(http.StatusOK, sessions)
}

// GetExecutionLogs 获取执行日志
func GetExecutionLogs(c *gin.Context) {
	scriptID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid script ID"})
		return
	}

	// URL解码会话名
	sessionName := c.Query("session_name")
	decodedSessionName, err := url.QueryUnescape(sessionName)
	if err != nil {
		fmt.Printf("[DEBUG] URL decode error: %v\n", err)
		decodedSessionName = sessionName // 如果解码失败，使用原始值
	}

	fmt.Printf("[DEBUG] GetExecutionLogs - scriptID: %d, original sessionName: %s, decoded: %s\n", 
		scriptID, sessionName, decodedSessionName)

	if sessionName == "" {
		fmt.Printf("[DEBUG] Session name is empty\n")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Session name is required"})
		return
	}

	// 添加调试打印
	fmt.Printf("[DEBUG] GetExecutionLogs - scriptID: %d, sessionName: '%s'\n", scriptID, sessionName)
	fmt.Printf("[DEBUG] Raw query string: %s\n", c.Request.URL.RawQuery)

	// 获取会话ID
	var sessionID int
	err = database.DB.QueryRow(
		"SELECT id FROM execution_sessions WHERE script_id = ? AND session_name = ?", 
		scriptID, decodedSessionName).Scan(&sessionID)
	if err != nil {
		fmt.Printf("[DEBUG] Session not found - scriptID: %d, sessionName: '%s', error: %v\n", scriptID, sessionName, err)

		// 查询所有会话以便调试
		rows, _ := database.DB.Query("SELECT session_name FROM execution_sessions WHERE script_id = ?", scriptID)
		if rows != nil {
			fmt.Printf("[DEBUG] Available sessions for script %d:\n", scriptID)
			for rows.Next() {
				var name string
				rows.Scan(&name)
				fmt.Printf("[DEBUG]   - '%s'\n", name)
			}
			rows.Close()
		}

		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}

	fmt.Printf("[DEBUG] Found sessionID: %d\n", sessionID)

	// 获取该会话的执行日志
	query := `
		SELECT id, script_id, host, status, output, error, executed_at
		FROM execution_logs
		WHERE script_id = ? AND DATE(executed_at) = DATE((SELECT created_at FROM execution_sessions WHERE id = ?))
		ORDER BY host
	`
	fmt.Printf("[DEBUG] Executing logs query with scriptID: %d, sessionID: %d\n", scriptID, sessionID)

	rows, err := database.DB.Query(query, scriptID, sessionID)
	if err != nil {
		fmt.Printf("[DEBUG] Query error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var logs []models.ExecutionLog
	for rows.Next() {
		var log models.ExecutionLog
		err := rows.Scan(&log.ID, &log.ScriptID, &log.Host, &log.Status, &log.Output, &log.Error, &log.ExecutedAt)
		if err != nil {
			fmt.Printf("[DEBUG] Row scan error: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		logs = append(logs, log)
	}

	fmt.Printf("[DEBUG] Found %d logs for session\n", len(logs))
	for i, log := range logs {
		fmt.Printf("[DEBUG] Log %d: Host=%s, Status=%s\n", i, log.Host, log.Status)
	}

	c.JSON(http.StatusOK, logs)
}

// UpdateScript 更新脚本
func UpdateScript(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var script models.Script
	if err := c.ShouldBindJSON(&script); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	script.UpdatedAt = time.Now()

	_, err = database.DB.Exec(
		"UPDATE scripts SET name=?, content=?, host_group_id=?, updated_at=? WHERE id=?",
		script.Name, script.Content, script.HostGroupID, script.UpdatedAt, id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	script.ID = id
	c.JSON(http.StatusOK, script)
}

// DeleteScript 删除脚本
func DeleteScript(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	_, err = database.DB.Exec("DELETE FROM scripts WHERE id=?", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Script deleted successfully"})
}
