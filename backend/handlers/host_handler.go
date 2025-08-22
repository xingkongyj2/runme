package handlers

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net"
	"net/http"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
	"time"

	"runme-backend/database"
	"runme-backend/models"
	"runme-backend/services" // 添加这一行

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/ssh"
)

// GetHostsByGroupID 获取指定主机组的所有主机
func GetHostsByGroupID(c *gin.Context) {
	groupIDStr := c.Param("groupId")
	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
		return
	}

	rows, err := database.DB.Query("SELECT id, ip, port, username, password, host_group_id, os_info, created_at, updated_at FROM hosts WHERE host_group_id = ?", groupID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch hosts"})
		return
	}
	defer rows.Close()

	var hosts []models.Host
	for rows.Next() {
		var host models.Host
		err := rows.Scan(&host.ID, &host.IP, &host.Port, &host.Username, &host.Password, &host.HostGroupID, &host.OSInfo, &host.CreatedAt, &host.UpdatedAt)
		if err != nil {
			continue
		}
		hosts = append(hosts, host)
	}

	c.JSON(http.StatusOK, gin.H{"data": hosts})
}

// CreateHost 创建新主机
func CreateHost(c *gin.Context) {
	var host models.Host
	if err := c.ShouldBindJSON(&host); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 设置默认端口
	if host.Port == 0 {
		host.Port = 22
	}

	host.CreatedAt = time.Now()
	host.UpdatedAt = time.Now()

	result, err := database.DB.Exec("INSERT INTO hosts (ip, port, username, password, host_group_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
		host.IP, host.Port, host.Username, host.Password, host.HostGroupID, host.CreatedAt, host.UpdatedAt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create host"})
		return
	}

	id, _ := result.LastInsertId()
	host.ID = int(id)

	c.JSON(http.StatusCreated, gin.H{"data": host})
}

// UpdateHost 更新主机信息
func UpdateHost(c *gin.Context) {
	hostIDStr := c.Param("id")
	hostID, err := strconv.Atoi(hostIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid host ID"})
		return
	}

	var host models.Host
	if err := c.ShouldBindJSON(&host); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	host.UpdatedAt = time.Now()

	_, err = database.DB.Exec("UPDATE hosts SET ip = ?, port = ?, username = ?, password = ?, updated_at = ? WHERE id = ?",
		host.IP, host.Port, host.Username, host.Password, host.UpdatedAt, hostID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update host"})
		return
	}

	host.ID = hostID
	c.JSON(http.StatusOK, gin.H{"data": host})
}

// GetHostOSInfo 获取主机操作系统信息
func GetHostOSInfo(c *gin.Context) {
	hostIDStr := c.Param("id")
	hostID, err := strconv.Atoi(hostIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid host ID"})
		return
	}

	// 获取主机信息
	var host models.Host
	err = database.DB.QueryRow("SELECT id, ip, port, username, password, host_group_id FROM hosts WHERE id = ?", hostID).Scan(
		&host.ID, &host.IP, &host.Port, &host.Username, &host.Password, &host.HostGroupID)

	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Host not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch host"})
		}
		return
	}

	// 获取操作系统信息
	osInfo := services.GetHostOSInfo(host.IP, host.Username, host.Password, host.Port)

	// 更新数据库中的操作系统信息
	_, err = database.DB.Exec("UPDATE hosts SET os_info = ?, updated_at = ? WHERE id = ?", osInfo, time.Now(), hostID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update host OS info"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"os_info": osInfo})
}

// GetHostByID 根据ID获取主机信息
func GetHostByID(c *gin.Context) {
	hostIDStr := c.Param("id")
	hostID, err := strconv.Atoi(hostIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid host ID"})
		return
	}

	var host models.Host
	err = database.DB.QueryRow("SELECT id, ip, port, username, password, host_group_id, os_info, created_at, updated_at FROM hosts WHERE id = ?", hostID).Scan(
		&host.ID, &host.IP, &host.Port, &host.Username, &host.Password, &host.HostGroupID, &host.OSInfo, &host.CreatedAt, &host.UpdatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Host not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch host"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": host})
}

// DeleteHost 删除主机
func DeleteHost(c *gin.Context) {
	hostIDStr := c.Param("id")
	hostID, err := strconv.Atoi(hostIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid host ID"})
		return
	}

	// 检查主机是否存在
	var exists bool
	err = database.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM hosts WHERE id = ?)", hostID).Scan(&exists)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check host existence"})
		return
	}

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Host not found"})
		return
	}

	// 删除主机
	_, err = database.DB.Exec("DELETE FROM hosts WHERE id = ?", hostID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete host"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Host deleted successfully"})
}

// PingHost Ping指定主机
func PingHost(c *gin.Context) {
	hostIDStr := c.Param("id")
	hostID, err := strconv.Atoi(hostIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid host ID"})
		return
	}

	// 获取主机信息
	var host models.Host
	err = database.DB.QueryRow("SELECT id, ip, port, username, password, host_group_id, os_info, created_at, updated_at FROM hosts WHERE id = ?", hostID).
		Scan(&host.ID, &host.IP, &host.Port, &host.Username, &host.Password, &host.HostGroupID, &host.OSInfo, &host.CreatedAt, &host.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Host not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch host"})
		}
		return
	}

	// 执行ping命令
	start := time.Now()

	var cmd *exec.Cmd
	var pingCmd string

	// 尝试查找ping命令的完整路径
	if runtime.GOOS == "windows" {
		pingCmd = "ping"
	} else {
		// 在Linux/Unix系统中，尝试常见的ping路径
		possiblePaths := []string{
			"ping",          // 系统PATH中
			"/bin/ping",     // 标准路径
			"/usr/bin/ping", // 用户程序路径
			"/sbin/ping",    // 系统管理员路径
		}

		for _, path := range possiblePaths {
			if _, err := exec.LookPath(path); err == nil {
				pingCmd = path
				break
			}
		}

		if pingCmd == "" {
			// 如果找不到ping命令，返回错误和安装建议
			suggestion := getPingInstallSuggestion()
			c.JSON(http.StatusOK, gin.H{
				"data": gin.H{
					"success": false,
					"latency": nil,
					"message": suggestion,
				},
			})
			return
		}
	}

	if runtime.GOOS == "windows" {
		cmd = exec.Command(pingCmd, "-n", "1", "-w", "3000", host.IP)
	} else {
		cmd = exec.Command(pingCmd, "-c", "1", "-W", "3", host.IP)
	}

	log.Printf("Pinging host %s (ID: %d) with command: %v", host.IP, host.ID, cmd.Args)

	output, err := cmd.CombinedOutput()
	latency := time.Since(start).Milliseconds()

	outputStr := strings.TrimSpace(string(output))

	// 详细的错误日志
	if err != nil {
		log.Printf("Ping FAILED for %s: error=%v, latency=%dms, output='%s'",
			host.IP, err, latency, outputStr)
	} else {
		log.Printf("Ping SUCCESS for %s: latency=%dms, output='%s'", host.IP, latency, outputStr)
	}

	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"data": gin.H{
				"success": false,
				"latency": nil,
				"message": fmt.Sprintf("Ping failed (%s): %s", err.Error(), outputStr),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"success": true,
			"latency": latency,
			"message": "Ping successful",
		},
	})
}

// PingHostsByGroup Ping主机组中的所有主机
func PingHostsByGroup(c *gin.Context) {
	groupIDStr := c.Param("groupId")
	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
		return
	}

	// 获取主机组中的所有主机
	rows, err := database.DB.Query("SELECT id, ip, port, username, password, host_group_id, os_info, created_at, updated_at FROM hosts WHERE host_group_id = ?", groupID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch hosts"})
		return
	}
	defer rows.Close()

	var hosts []models.Host
	for rows.Next() {
		var host models.Host
		var createdAt, updatedAt string
		err := rows.Scan(&host.ID, &host.IP, &host.Port, &host.Username, &host.Password, &host.HostGroupID, &host.OSInfo, &createdAt, &updatedAt)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan host data"})
			return
		}
		hosts = append(hosts, host)
	}

	// 对每个主机执行ping
	results := make(map[string]interface{})
	log.Printf("Starting batch ping for group %d with %d hosts", groupID, len(hosts))

	// 预先查找ping命令路径
	var pingCmd string
	if runtime.GOOS == "windows" {
		pingCmd = "ping"
	} else {
		// 在Linux/Unix系统中，尝试常见的ping路径
		possiblePaths := []string{
			"ping",          // 系统PATH中
			"/bin/ping",     // 标准路径
			"/usr/bin/ping", // 用户程序路径
			"/sbin/ping",    // 系统管理员路径
		}

		for _, path := range possiblePaths {
			if _, err := exec.LookPath(path); err == nil {
				pingCmd = path
				break
			}
		}

		if pingCmd == "" {
			// 如果找不到ping命令，为所有主机返回错误和安装建议
			suggestion := getPingInstallSuggestion()
			for _, host := range hosts {
				results[host.IP] = gin.H{
					"success": false,
					"latency": nil,
					"message": suggestion,
				}
			}
			c.JSON(http.StatusOK, gin.H{"data": results})
			return
		}
	}

	for _, host := range hosts {
		start := time.Now()

		var cmd *exec.Cmd
		if runtime.GOOS == "windows" {
			cmd = exec.Command(pingCmd, "-n", "1", "-w", "3000", host.IP)
		} else {
			cmd = exec.Command(pingCmd, "-c", "1", "-W", "3", host.IP)
		}

		log.Printf("Pinging host %s (ID: %d) with command: %v", host.IP, host.ID, cmd.Args)

		output, err := cmd.CombinedOutput()
		latency := time.Since(start).Milliseconds()

		outputStr := strings.TrimSpace(string(output))

		// 详细的错误日志
		if err != nil {
			log.Printf("Ping FAILED for %s: error=%v, latency=%dms, output='%s'",
				host.IP, err, latency, outputStr)
		} else {
			log.Printf("Ping SUCCESS for %s: latency=%dms, output='%s'", host.IP, latency, outputStr)
		}

		if err != nil {
			results[host.IP] = gin.H{
				"success": false,
				"latency": nil,
				"message": fmt.Sprintf("Ping failed (%s): %s", err.Error(), outputStr),
			}
		} else {
			results[host.IP] = gin.H{
				"success": true,
				"latency": latency,
				"message": "Ping successful",
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": results})
}

// TestSSHConnection 测试SSH连接
func TestSSHConnection(c *gin.Context) {
	hostIDStr := c.Param("id")
	hostID, err := strconv.Atoi(hostIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid host ID"})
		return
	}

	// 获取主机信息
	var host models.Host
	err = database.DB.QueryRow("SELECT id, ip, port, username, password, host_group_id, os_info, created_at, updated_at FROM hosts WHERE id = ?", hostID).
		Scan(&host.ID, &host.IP, &host.Port, &host.Username, &host.Password, &host.HostGroupID, &host.OSInfo, &host.CreatedAt, &host.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Host not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch host"})
		}
		return
	}

	// 测试SSH连接
	start := time.Now()
	success, message := testSSHConnect(host.IP, host.Port, host.Username, host.Password)
	latency := time.Since(start).Milliseconds()

	log.Printf("SSH test for %s:%d (ID: %d): success=%v, latency=%dms, message=%s",
		host.IP, host.Port, host.ID, success, latency, message)

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"success": success,
			"latency": latency,
			"message": message,
		},
	})
}

// TestSSHConnectionsByGroup 测试主机组中所有主机的SSH连接
func TestSSHConnectionsByGroup(c *gin.Context) {
	groupIDStr := c.Param("groupId")
	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
		return
	}

	// 获取主机组中的所有主机
	rows, err := database.DB.Query("SELECT id, ip, port, username, password, host_group_id, os_info, created_at, updated_at FROM hosts WHERE host_group_id = ?", groupID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch hosts"})
		return
	}
	defer rows.Close()

	var hosts []models.Host
	for rows.Next() {
		var host models.Host
		var createdAt, updatedAt string
		err := rows.Scan(&host.ID, &host.IP, &host.Port, &host.Username, &host.Password, &host.HostGroupID, &host.OSInfo, &createdAt, &updatedAt)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan host data"})
			return
		}
		hosts = append(hosts, host)
	}

	// 对每个主机测试SSH连接
	results := make(map[string]interface{})
	log.Printf("Starting batch SSH test for group %d with %d hosts", groupID, len(hosts))

	for _, host := range hosts {
		start := time.Now()
		success, message := testSSHConnect(host.IP, host.Port, host.Username, host.Password)
		latency := time.Since(start).Milliseconds()

		log.Printf("SSH test for %s:%d (ID: %d): success=%v, latency=%dms, message=%s",
			host.IP, host.Port, host.ID, success, latency, message)

		results[host.IP] = gin.H{
			"success": success,
			"latency": latency,
			"message": message,
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": results})
}

// testSSHConnect 测试SSH连接的辅助函数
func testSSHConnect(host string, port int, username, password string) (bool, string) {
	// 配置SSH连接
	config := &ssh.ClientConfig{
		User: username,
		Auth: []ssh.AuthMethod{
			ssh.Password(password),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(), // 注意：生产环境应该验证主机密钥
		Timeout:         3 * time.Second,             // 3秒超时，更快响应
	}

	// 构建连接地址
	address := fmt.Sprintf("%s:%d", host, port)

	// 使用context控制整体超时
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	// 创建一个channel来接收结果
	resultChan := make(chan struct {
		success bool
		message string
	}, 1)

	go func() {
		// 尝试建立SSH连接
		client, err := ssh.Dial("tcp", address, config)
		if err != nil {
			// 检查是否是网络连接错误
			if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
				resultChan <- struct {
					success bool
					message string
				}{false, "timeout"}
				return
			}
			if strings.Contains(err.Error(), "connection refused") {
				resultChan <- struct {
					success bool
					message string
				}{false, "refused"}
				return
			}
			if strings.Contains(err.Error(), "no route to host") || strings.Contains(err.Error(), "network unreachable") {
				resultChan <- struct {
					success bool
					message string
				}{false, "unreachable"}
				return
			}
			if strings.Contains(err.Error(), "authentication failed") {
				resultChan <- struct {
					success bool
					message string
				}{false, "auth_failed"}
				return
			}
			resultChan <- struct {
				success bool
				message string
			}{false, "failed"}
			return
		}
		defer client.Close()

		// 尝试执行一个简单的命令来确认连接正常
		session, err := client.NewSession()
		if err != nil {
			resultChan <- struct {
				success bool
				message string
			}{false, "session_failed"}
			return
		}
		defer session.Close()

		// 执行echo命令测试
		output, err := session.Output("echo 'test'")
		if err != nil {
			resultChan <- struct {
				success bool
				message string
			}{false, "command_failed"}
			return
		}

		if strings.Contains(string(output), "test") {
			resultChan <- struct {
				success bool
				message string
			}{true, "connected"}
		} else {
			resultChan <- struct {
				success bool
				message string
			}{false, "test_failed"}
		}
	}()

	// 等待结果或超时
	select {
	case result := <-resultChan:
		return result.success, result.message
	case <-ctx.Done():
		return false, "timeout"
	}
}

// getPingInstallSuggestion 获取ping安装建议
func getPingInstallSuggestion() string {
	// 检测Linux发行版并给出安装建议
	if _, err := exec.LookPath("apt-get"); err == nil {
		return "ping command not found. Try: sudo apt-get install iputils-ping"
	}
	if _, err := exec.LookPath("yum"); err == nil {
		return "ping command not found. Try: sudo yum install iputils"
	}
	if _, err := exec.LookPath("dnf"); err == nil {
		return "ping command not found. Try: sudo dnf install iputils"
	}
	if _, err := exec.LookPath("zypper"); err == nil {
		return "ping command not found. Try: sudo zypper install iputils"
	}
	return "ping command not found on system. Please install ping utility."
}
