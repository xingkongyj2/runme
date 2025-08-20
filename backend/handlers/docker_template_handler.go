package handlers

import (
	"fmt"
	"net/http"
	"runme-backend/database"
	"runme-backend/models"
	"runme-backend/services"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// GetDockerTemplates 获取所有Docker模板
func GetDockerTemplates(c *gin.Context) {
	rows, err := database.DB.Query(`
		SELECT id, name, docker_command, created_at, updated_at 
		FROM docker_templates ORDER BY created_at DESC
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var templates []models.DockerTemplate
	for rows.Next() {
		var template models.DockerTemplate
		err := rows.Scan(
			&template.ID, &template.Name, &template.DockerCommand,
			&template.CreatedAt, &template.UpdatedAt,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		templates = append(templates, template)
	}

	c.JSON(http.StatusOK, gin.H{"data": templates})
}

// GetDockerTemplate 获取单个Docker模板
func GetDockerTemplate(c *gin.Context) {
	id := c.Param("id")

	var template models.DockerTemplate
	err := database.DB.QueryRow(`
		SELECT id, name, docker_command, created_at, updated_at 
		FROM docker_templates WHERE id = ?
	`, id).Scan(
		&template.ID, &template.Name, &template.DockerCommand,
		&template.CreatedAt, &template.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Docker template not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": template})
}

// CreateDockerTemplate 创建Docker模板
func CreateDockerTemplate(c *gin.Context) {
	var template models.DockerTemplate
	if err := c.ShouldBindJSON(&template); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	template.CreatedAt = time.Now()
	template.UpdatedAt = time.Now()

	result, err := database.DB.Exec(`
		INSERT INTO docker_templates (name, docker_command, created_at, updated_at) 
		VALUES (?, ?, ?, ?)
	`,
		template.Name, template.DockerCommand, template.CreatedAt, template.UpdatedAt,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	id, err := result.LastInsertId()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	template.ID = int(id)
	c.JSON(http.StatusCreated, gin.H{"data": template})
}

// UpdateDockerTemplate 更新Docker模板
func UpdateDockerTemplate(c *gin.Context) {
	id := c.Param("id")

	var template models.DockerTemplate
	if err := c.ShouldBindJSON(&template); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	template.UpdatedAt = time.Now()

	result, err := database.DB.Exec(`
		UPDATE docker_templates 
		SET name = ?, docker_command = ?, updated_at = ? 
		WHERE id = ?
	`,
		template.Name, template.DockerCommand, template.UpdatedAt, id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Docker template not found"})
		return
	}

	// 获取更新后的模板
	idInt, _ := strconv.Atoi(id)
	template.ID = idInt
	c.JSON(http.StatusOK, gin.H{"data": template})
}

// DeleteDockerTemplate 删除Docker模板
func DeleteDockerTemplate(c *gin.Context) {
	id := c.Param("id")

	result, err := database.DB.Exec("DELETE FROM docker_templates WHERE id = ?", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Docker template not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Docker template deleted successfully"})
}

// ExecuteDockerTemplate 执行Docker模板
func ExecuteDockerTemplate(c *gin.Context) {
	templateID := c.Param("id")

	var req struct {
		HostID        int    `json:"host_id" binding:"required"`
		DockerCommand string `json:"docker_command" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 获取主机信息
	var host models.Host
	err := database.DB.QueryRow(`
		SELECT id, ip, port, username, password, host_group_id 
		FROM hosts WHERE id = ?
	`, req.HostID).Scan(
		&host.ID, &host.IP, &host.Port, &host.Username, &host.Password, &host.HostGroupID,
	)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Host not found"})
		return
	}

	// 先检查Docker是否可用
	dockerCheckCmd := "docker --version && docker info"
	checkResult, checkErr := services.ExecuteSSHCommand(host.IP, host.Username, host.Password, host.Port, dockerCheckCmd)

	var errorDetails string
	if checkErr != nil {
		errorDetails = fmt.Sprintf("Docker环境检查失败: %v\n检查结果: %s\n", checkErr, checkResult)
	}

	// 执行Docker命令，如果失败则尝试使用sudo
	result, err := services.ExecuteSSHCommand(host.IP, host.Username, host.Password, host.Port, req.DockerCommand)
	if err != nil && strings.Contains(err.Error(), "status 125") {
		// 尝试使用sudo执行
		sudoCommand := "sudo " + req.DockerCommand
		result, err = services.ExecuteSSHCommand(host.IP, host.Username, host.Password, host.Port, sudoCommand)
	}
	if err != nil {
		fullError := fmt.Sprintf("Failed to execute command: %v", err)
		if errorDetails != "" {
			fullError = errorDetails + fullError
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error":        fullError,
			"result":       result,
			"docker_check": checkResult,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Command executed successfully",
		"result":      result,
		"template_id": templateID,
		"host_id":     req.HostID,
	})
}
