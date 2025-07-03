package handlers

import (
	"net/http"
	"runme-backend/database"
	"runme-backend/models"
	"runme-backend/services"
	"strconv"

	"github.com/gin-gonic/gin"
)

// GetSystemInfo 获取系统信息
func GetSystemInfo(c *gin.Context) {
	groupIDStr := c.Param("groupId")
	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
		return
	}

	// 特殊处理：如果groupId为0，返回本地系统信息
	if groupID == 0 {
		localInfo := services.GetLocalSystemInfo()
		c.JSON(http.StatusOK, gin.H{"data": []models.SystemInfo{localInfo}})
		return
	}

	// 获取主机组下的所有主机
	rows, err := database.DB.Query("SELECT ip, port, username, password FROM hosts WHERE host_group_id = ?", groupID)
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

	var systemInfos []models.SystemInfo
	// 并发获取每个主机的系统信息
	resultChan := make(chan models.SystemInfo, len(hosts))

	for _, host := range hosts {
		go func(h models.Host) {
			info := services.GetHostSystemInfo(h.IP, h.Username, h.Password, h.Port)
			resultChan <- info
		}(host)
	}

	// 收集结果
	for i := 0; i < len(hosts); i++ {
		systemInfos = append(systemInfos, <-resultChan)
	}

	c.JSON(http.StatusOK, gin.H{"data": systemInfos})
}

// GetProcessInfo 获取进程信息
func GetProcessInfo(c *gin.Context) {
	groupIDStr := c.Param("groupId")
	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
		return
	}

	// 特殊处理：如果groupId为0，返回本地进程信息
	if groupID == 0 {
		localProcesses := services.GetLocalProcessInfo()
		c.JSON(http.StatusOK, gin.H{"data": localProcesses})
		return
	}

	// 获取主机组下的所有主机
	rows, err := database.DB.Query("SELECT ip, port, username, password FROM hosts WHERE host_group_id = ?", groupID)
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

	var processInfos []models.ProcessInfo
	// 并发获取每个主机的进程信息
	resultChan := make(chan []models.ProcessInfo, len(hosts))

	for _, host := range hosts {
		go func(h models.Host) {
			processes := services.GetHostProcessInfo(h.IP, h.Username, h.Password, h.Port)
			resultChan <- processes
		}(host)
	}

	// 收集结果
	for i := 0; i < len(hosts); i++ {
		processInfos = append(processInfos, <-resultChan...)
	}

	c.JSON(http.StatusOK, gin.H{"data": processInfos})
}
