package handlers

import (
	"net/http"
	"runme-backend/models"
	"runme-backend/services"
	"strconv"
	"strings"

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

	// 获取主机组信息
	hostGroup, err := services.GetHostGroupByID(groupID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Host group not found"})
		return
	}

	// 获取主机列表
	hosts := strings.Split(hostGroup.Hosts, "\n")
	var systemInfos []models.SystemInfo

	// 并发获取每个主机的系统信息
	resultChan := make(chan models.SystemInfo, len(hosts))
	for _, host := range hosts {
		host = strings.TrimSpace(host)
		if host == "" {
			continue
		}
		go func(h string) {
			info := services.GetHostSystemInfo(h, hostGroup.Username, hostGroup.Password, hostGroup.Port)
			resultChan <- info
		}(host)
	}

	// 收集结果
	for i := 0; i < len(hosts); i++ {
		if hosts[i] != "" {
			systemInfos = append(systemInfos, <-resultChan)
		}
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

	// 获取主机组信息
	hostGroup, err := services.GetHostGroupByID(groupID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Host group not found"})
		return
	}

	// 获取主机列表
	hosts := strings.Split(hostGroup.Hosts, "\n")
	var processInfos []models.ProcessInfo

	// 并发获取每个主机的进程信息
	resultChan := make(chan []models.ProcessInfo, len(hosts))
	for _, host := range hosts {
		host = strings.TrimSpace(host)
		if host == "" {
			continue
		}
		go func(h string) {
			processes := services.GetHostProcessInfo(h, hostGroup.Username, hostGroup.Password, hostGroup.Port)
			resultChan <- processes
		}(host)
	}

	// 收集结果
	for i := 0; i < len(hosts); i++ {
		if hosts[i] != "" {
			processInfos = append(processInfos, <-resultChan...)
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": processInfos})
}