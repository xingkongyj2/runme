package handlers

import (
	"fmt"
	"log"
	"net/http"
	"runme-backend/database"
	"runme-backend/models"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// GetHostGroups 获取所有主机组
func GetHostGroups(c *gin.Context) {
	rows, err := database.DB.Query("SELECT id, name, created_at, updated_at FROM host_groups")
	if err != nil {
		log.Printf("Failed to query host groups: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var hostGroups []models.HostGroup
	for rows.Next() {
		var hg models.HostGroup
		var createdAt, updatedAt string // 使用string类型暂时接收时间

		err := rows.Scan(&hg.ID, &hg.Name, &createdAt, &updatedAt)
		if err != nil {
			log.Printf("Failed to scan host group row: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// 解析时间字符串
		if parsedTime, err := time.Parse("2006-01-02 15:04:05", createdAt); err == nil {
			hg.CreatedAt = parsedTime
		} else if parsedTime, err := time.Parse(time.RFC3339, createdAt); err == nil {
			hg.CreatedAt = parsedTime
		} else {
			hg.CreatedAt = time.Now() // 默认当前时间
		}

		if parsedTime, err := time.Parse("2006-01-02 15:04:05", updatedAt); err == nil {
			hg.UpdatedAt = parsedTime
		} else if parsedTime, err := time.Parse(time.RFC3339, updatedAt); err == nil {
			hg.UpdatedAt = parsedTime
		} else {
			hg.UpdatedAt = time.Now() // 默认当前时间
		}

		hostGroups = append(hostGroups, hg)
	}

	log.Printf("Successfully fetched %d host groups", len(hostGroups))
	c.JSON(http.StatusOK, gin.H{"data": hostGroups})
}

// CreateHostGroup 创建主机组
func CreateHostGroup(c *gin.Context) {
	var hg models.HostGroup
	if err := c.ShouldBindJSON(&hg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hg.CreatedAt = time.Now()
	hg.UpdatedAt = time.Now()

	result, err := database.DB.Exec(
		"INSERT INTO host_groups (name, created_at, updated_at) VALUES (?, ?, ?)",
		hg.Name, hg.CreatedAt, hg.UpdatedAt,
	)
	if err != nil {
		log.Printf("Failed to create host group: %v", err)
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "主机组名称已存在"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("数据库操作失败: %v", err)})
		}
		return
	}

	id, _ := result.LastInsertId()
	hg.ID = int(id)
	c.JSON(http.StatusCreated, hg)
}

// UpdateHostGroup 更新主机组
func UpdateHostGroup(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var hg models.HostGroup
	if err := c.ShouldBindJSON(&hg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hg.UpdatedAt = time.Now()

	_, err = database.DB.Exec(
		"UPDATE host_groups SET name=?, updated_at=? WHERE id=?",
		hg.Name, hg.UpdatedAt, id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	hg.ID = id
	c.JSON(http.StatusOK, hg)
}

// DeleteHostGroup 删除主机组
func DeleteHostGroup(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	_, err = database.DB.Exec("DELETE FROM host_groups WHERE id=?", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Host group deleted successfully"})
}
