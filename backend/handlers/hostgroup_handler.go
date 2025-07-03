package handlers

import (
	"net/http"
	"runme-backend/database"
	"runme-backend/models"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// GetHostGroups 获取所有主机组
func GetHostGroups(c *gin.Context) {
	rows, err := database.DB.Query("SELECT id, name, created_at, updated_at FROM host_groups")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var hostGroups []models.HostGroup
	for rows.Next() {
		var hg models.HostGroup
		err := rows.Scan(&hg.ID, &hg.Name, &hg.CreatedAt, &hg.UpdatedAt)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		hostGroups = append(hostGroups, hg)
	}

	c.JSON(http.StatusOK, hostGroups)
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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
