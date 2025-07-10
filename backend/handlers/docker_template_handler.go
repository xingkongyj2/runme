package handlers

import (
	"net/http"
	"runme-backend/database"
	"runme-backend/models"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// GetDockerTemplates 获取所有Docker模板
func GetDockerTemplates(c *gin.Context) {
	rows, err := database.DB.Query(`
		SELECT id, name, description, image, ports, volumes, environment, docker_compose, created_at, updated_at 
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
			&template.ID, &template.Name, &template.Description, &template.Image,
			&template.Ports, &template.Volumes, &template.Environment, &template.DockerCompose,
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
		SELECT id, name, description, image, ports, volumes, environment, docker_compose, created_at, updated_at 
		FROM docker_templates WHERE id = ?
	`, id).Scan(
		&template.ID, &template.Name, &template.Description, &template.Image,
		&template.Ports, &template.Volumes, &template.Environment, &template.DockerCompose,
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
		INSERT INTO docker_templates (name, description, image, ports, volumes, environment, docker_compose, created_at, updated_at) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		template.Name, template.Description, template.Image, template.Ports,
		template.Volumes, template.Environment, template.DockerCompose,
		template.CreatedAt, template.UpdatedAt,
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
		SET name = ?, description = ?, image = ?, ports = ?, volumes = ?, environment = ?, docker_compose = ?, updated_at = ? 
		WHERE id = ?
	`,
		template.Name, template.Description, template.Image, template.Ports,
		template.Volumes, template.Environment, template.DockerCompose,
		template.UpdatedAt, id,
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
