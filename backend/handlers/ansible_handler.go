package handlers

import (
	"fmt"
	"math/rand"
	"net/http"
	"net/url"
	"runme-backend/database"
	"runme-backend/models"
	"runme-backend/services"
	"strconv"
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

	// 获取playbook信息
	var playbook models.AnsiblePlaybook
	err = database.DB.QueryRow(`
		SELECT id, name, content, variables, host_group_id
		FROM ansible_playbooks
		WHERE id = ?
	`, playbookID).Scan(&playbook.ID, &playbook.Name, &playbook.Content, &playbook.Variables, &playbook.HostGroupID)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Playbook not found"})
		return
	}

	// 获取主机组中的所有主机
	rows, err := database.DB.Query("SELECT ip, port, username, password FROM hosts WHERE host_group_id = ?", playbook.HostGroupID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch hosts"})
		return
	}
	defer rows.Close()

	var hosts []models.Host
	for rows.Next() {
		var host models.Host
		err := rows.Scan(&host.IP, &host.Port, &host.Username, &host.Password)
		if err != nil {
			continue
		}
		hosts = append(hosts, host)
	}

	if len(hosts) == 0 {
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

	// 异步执行playbook（在当前机器上执行，连接到所有目标主机）
	go func() {
		// 在当前机器上执行Ansible，连接到所有主机
		output, err := services.ExecuteAnsiblePlaybook(hosts, playbook.Content, playbook.Variables)

		// 为每个主机创建执行日志记录
		for _, host := range hosts {
			log := models.AnsibleExecutionLog{
				PlaybookID: playbookID,
				Host:       host.IP,
				ExecutedAt: time.Now(),
			}

			if err != nil {
				log.Status = "failed"
				log.Error = err.Error()
				log.Output = output // 包含错误信息
			} else {
				log.Status = "success"
				log.Output = output // 包含成功的执行输出
			}

			// 保存执行日志
			_, saveErr := database.DB.Exec(
				"INSERT INTO ansible_execution_logs (playbook_id, host, status, output, error, executed_at) VALUES (?, ?, ?, ?, ?, ?)",
				log.PlaybookID, log.Host, log.Status, log.Output, log.Error, log.ExecutedAt,
			)
			if saveErr != nil {
				fmt.Printf("Failed to save execution log for host %s: %v\n", host.IP, saveErr)
			}
		}
	}()

	c.JSON(http.StatusOK, gin.H{"message": "Playbook execution started", "session_name": sessionName})
}

// ContinueAnsibleExecution 继续执行剩余主机的Ansible Playbook
func ContinueAnsibleExecution(c *gin.Context) {
	playbookID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid playbook ID"})
		return
	}

	var requestBody struct {
		SessionName    string   `json:"session_name"`
		RemainingHosts []string `json:"remaining_hosts"`
	}

	if err := c.ShouldBindJSON(&requestBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 获取playbook信息
	var playbook models.AnsiblePlaybook
	err = database.DB.QueryRow(`
		SELECT id, name, content, variables, host_group_id
		FROM ansible_playbooks
		WHERE id = ?
	`, playbookID).Scan(&playbook.ID, &playbook.Name, &playbook.Content, &playbook.Variables, &playbook.HostGroupID)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Playbook not found"})
		return
	}

	// 异步执行剩余主机
	go func() {
		// 收集所有剩余主机信息
		var remainingHosts []models.Host
		for _, hostIP := range requestBody.RemainingHosts {
			// 获取主机的认证信息
			var host models.Host
			err := database.DB.QueryRow("SELECT ip, port, username, password FROM hosts WHERE ip = ? AND host_group_id = ?", hostIP, playbook.HostGroupID).Scan(
				&host.IP, &host.Port, &host.Username, &host.Password)
			if err != nil {
				fmt.Printf("Failed to get host info for %s: %v\n", hostIP, err)
				continue
			}
			remainingHosts = append(remainingHosts, host)
		}

		if len(remainingHosts) == 0 {
			fmt.Println("No valid remaining hosts found")
			return
		}

		// 在当前机器上执行Ansible，连接到所有剩余主机
		output, err := services.ExecuteAnsiblePlaybook(remainingHosts, playbook.Content, playbook.Variables)

		// 为每个剩余主机创建执行日志记录
		for _, host := range remainingHosts {
			log := models.AnsibleExecutionLog{
				PlaybookID: playbookID,
				Host:       host.IP,
				ExecutedAt: time.Now(),
			}

			if err != nil {
				log.Status = "failed"
				log.Error = err.Error()
				log.Output = output // 包含错误信息
			} else {
				log.Status = "success"
				log.Output = output // 包含成功的执行输出
			}

			// 保存执行日志
			_, saveErr := database.DB.Exec(
				"INSERT INTO ansible_execution_logs (playbook_id, host, status, output, error, executed_at) VALUES (?, ?, ?, ?, ?, ?)",
				log.PlaybookID, log.Host, log.Status, log.Output, log.Error, log.ExecutedAt,
			)
			if saveErr != nil {
				fmt.Printf("Failed to save execution log for host %s: %v\n", host.IP, saveErr)
			}
		}
	}()

	c.JSON(http.StatusOK, gin.H{
		"session_name": requestBody.SessionName,
		"message":      "剩余主机执行已启动",
	})
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

// ExecuteAnsiblePlaybookExperimental 实验性执行Ansible Playbook（先在随机主机上测试）
func ExecuteAnsiblePlaybookExperimental(c *gin.Context) {
	playbookID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid playbook ID"})
		return
	}

	// 获取playbook信息
	var playbook models.AnsiblePlaybook
	err = database.DB.QueryRow(`
		SELECT id, name, content, variables, host_group_id
		FROM ansible_playbooks
		WHERE id = ?
	`, playbookID).Scan(&playbook.ID, &playbook.Name, &playbook.Content, &playbook.Variables, &playbook.HostGroupID)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Playbook not found"})
		return
	}

	// 获取主机组中的所有主机
	rows, err := database.DB.Query("SELECT ip, port, username, password FROM hosts WHERE host_group_id = ?", playbook.HostGroupID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch hosts"})
		return
	}
	defer rows.Close()

	var hosts []models.Host
	for rows.Next() {
		var host models.Host
		err := rows.Scan(&host.IP, &host.Port, &host.Username, &host.Password)
		if err != nil {
			continue
		}
		hosts = append(hosts, host)
	}

	if len(hosts) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No valid hosts found"})
		return
	}

	if len(hosts) == 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only one host available, experimental mode not applicable"})
		return
	}

	// 随机选择一个实验主机
	rand.Seed(time.Now().UnixNano())
	experimentalHostIndex := rand.Intn(len(hosts))
	experimentalHost := hosts[experimentalHostIndex]

	// 创建剩余主机列表
	remainingHosts := make([]string, 0, len(hosts)-1)
	for i, host := range hosts {
		if i != experimentalHostIndex {
			remainingHosts = append(remainingHosts, host.IP)
		}
	}

	// 创建执行会话
	sessionName := fmt.Sprintf("%s_experimental_%d", playbook.Name, time.Now().Unix())
	_, err = database.DB.Exec(
		"INSERT INTO ansible_execution_sessions (playbook_id, session_name, created_at) VALUES (?, ?, ?)",
		playbookID, sessionName, time.Now(),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create execution session"})
		return
	}

	// 在实验主机上执行playbook
	log := models.AnsibleExecutionLog{
		PlaybookID: playbookID,
		Host:       experimentalHost.IP,
		ExecutedAt: time.Now(),
	}

	output, err := services.ExecuteAnsiblePlaybookSingleHost(experimentalHost.IP, experimentalHost.Username, experimentalHost.Password, experimentalHost.Port, playbook.Content, playbook.Variables)
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save execution log"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"session_name":      sessionName,
		"experimental_host": experimentalHost.IP,
		"status":            log.Status,
		"output":            log.Output,
		"error":             log.Error,
		"remaining_hosts":   remainingHosts,
		"message":           "实验性执行完成",
	})
}
