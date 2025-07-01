package handlers

import (
	"net/http"
	"runme-backend/database"
	"runme-backend/models"
	"runme-backend/services"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// GetDeploymentTasks 获取所有部署任务
func GetDeploymentTasks(c *gin.Context) {
	rows, err := database.DB.Query(`
		SELECT dt.id, dt.name, dt.github_url, dt.branch, dt.host_group_id, 
		       dt.status, dt.description, dt.created_at, dt.updated_at,
		       hg.name as host_group_name
		FROM deployment_tasks dt
		LEFT JOIN host_groups hg ON dt.host_group_id = hg.id
		ORDER BY dt.created_at DESC
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var tasks []map[string]interface{}
	for rows.Next() {
		var task models.DeploymentTask
		var hostGroupName string
		err := rows.Scan(&task.ID, &task.Name, &task.GithubURL, &task.Branch,
			&task.HostGroupID, &task.Status, &task.Description,
			&task.CreatedAt, &task.UpdatedAt, &hostGroupName)
		if err != nil {
			continue
		}

		taskMap := map[string]interface{}{
			"id":              task.ID,
			"name":            task.Name,
			"github_url":      task.GithubURL,
			"branch":          task.Branch,
			"host_group_id":   task.HostGroupID,
			"host_group_name": hostGroupName,
			"status":          task.Status,
			"description":     task.Description,
			"created_at":      task.CreatedAt,
			"updated_at":      task.UpdatedAt,
		}
		tasks = append(tasks, taskMap)
	}

	c.JSON(http.StatusOK, tasks)
}

// CreateDeploymentTask 创建部署任务
func CreateDeploymentTask(c *gin.Context) {
	var task models.DeploymentTask
	if err := c.ShouldBindJSON(&task); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 设置默认值
	if task.Branch == "" {
		task.Branch = "main"
	}
	task.Status = "pending"
	task.CreatedAt = time.Now()
	task.UpdatedAt = time.Now()

	// 插入数据库
	result, err := database.DB.Exec(`
		INSERT INTO deployment_tasks (name, github_url, branch, host_group_id, status, description, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, task.Name, task.GithubURL, task.Branch, task.HostGroupID, task.Status, task.Description, task.CreatedAt, task.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	id, _ := result.LastInsertId()
	task.ID = int(id)

	c.JSON(http.StatusCreated, task)
}

// ExecuteDeploymentTask 执行部署任务
func ExecuteDeploymentTask(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	// 获取任务信息
	var task models.DeploymentTask
	err = database.DB.QueryRow(`
		SELECT id, name, github_url, branch, host_group_id, status, description
		FROM deployment_tasks WHERE id = ?
	`, id).Scan(&task.ID, &task.Name, &task.GithubURL, &task.Branch, &task.HostGroupID, &task.Status, &task.Description)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	// 检查任务状态
	if task.Status == "running" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Task is already running"})
		return
	}

	// 异步执行部署
	go func() {
		if err := services.DeployProject(&task); err != nil {
			// 记录错误日志
			database.DB.Exec("UPDATE deployment_tasks SET status = 'failed', updated_at = ? WHERE id = ?",
				time.Now(), task.ID)
		}
	}()

	c.JSON(http.StatusOK, gin.H{"message": "Deployment started"})
}

// GetDeploymentLogs 获取部署日志
func GetDeploymentLogs(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	rows, err := database.DB.Query(`
		SELECT id, task_id, host, status, output, error, deployed_at
		FROM deployment_logs WHERE task_id = ?
		ORDER BY deployed_at DESC
	`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var logs []models.DeploymentLog
	for rows.Next() {
		var log models.DeploymentLog
		err := rows.Scan(&log.ID, &log.TaskID, &log.Host, &log.Status,
			&log.Output, &log.Error, &log.DeployedAt)
		if err != nil {
			continue
		}
		logs = append(logs, log)
	}

	c.JSON(http.StatusOK, logs)
}

// DeleteDeploymentTask 删除部署任务
func DeleteDeploymentTask(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	// 删除相关日志
	_, err = database.DB.Exec("DELETE FROM deployment_logs WHERE task_id = ?", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 删除任务
	_, err = database.DB.Exec("DELETE FROM deployment_tasks WHERE id = ?", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Task deleted successfully"})
}
