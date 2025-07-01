package handlers

import (
	"database/sql"
	"net/http"
	"strconv"
	"time"

	"runme-backend/database"
	"runme-backend/models"

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

	rows, err := database.DB.Query("SELECT id, ip, host_group_id, created_at, updated_at FROM hosts WHERE host_group_id = ?", groupID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch hosts"})
		return
	}
	defer rows.Close()

	var hosts []models.Host
	for rows.Next() {
		var host models.Host
		err := rows.Scan(&host.ID, &host.IP, &host.HostGroupID, &host.CreatedAt, &host.UpdatedAt)
		if err != nil {
			continue
		}
		hosts = append(hosts, host)
	}

	c.JSON(http.StatusOK, gin.H{"data": hosts})
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
	err = database.DB.QueryRow("SELECT id, ip, host_group_id, created_at, updated_at FROM hosts WHERE id = ?", hostID).Scan(
		&host.ID, &host.IP, &host.HostGroupID, &host.CreatedAt, &host.UpdatedAt)
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

// CreateHost 创建新主机
func CreateHost(c *gin.Context) {
	var host models.Host
	if err := c.ShouldBindJSON(&host); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	host.CreatedAt = time.Now()
	host.UpdatedAt = time.Now()

	result, err := database.DB.Exec("INSERT INTO hosts (ip, host_group_id, created_at, updated_at) VALUES (?, ?, ?, ?)",
		host.IP, host.HostGroupID, host.CreatedAt, host.UpdatedAt)
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

	_, err = database.DB.Exec("UPDATE hosts SET ip = ?, updated_at = ? WHERE id = ?",
		host.IP, host.UpdatedAt, hostID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update host"})
		return
	}

	host.ID = hostID
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

	_, err = database.DB.Exec("DELETE FROM hosts WHERE id = ?", hostID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete host"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Host deleted successfully"})
}
