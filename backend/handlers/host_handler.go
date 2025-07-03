package handlers

import (
	"database/sql"
	"net/http"
	"strconv"
	"time"

	"runme-backend/database"
	"runme-backend/models"
	"runme-backend/services" // 添加这一行

	"github.com/gin-gonic/gin"
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
