package main

import (
	"log"
	"runme-backend/database"
	"runme-backend/handlers"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// 初始化数据库
	database.InitDB()
	defer database.DB.Close()

	// 创建Gin路由
	r := gin.Default()

	// 配置CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowCredentials: true,
	}))

	// API路由组
	api := r.Group("/api")
	{
		// 主机组路由
		hostGroups := api.Group("/hostgroups")
		{
			hostGroups.GET("", handlers.GetHostGroups)
			hostGroups.POST("", handlers.CreateHostGroup)
			hostGroups.PUT("/:id", handlers.UpdateHostGroup)
			hostGroups.DELETE("/:id", handlers.DeleteHostGroup)
		}

		// 脚本路由
		scripts := api.Group("/scripts")
		{
			scripts.GET("", handlers.GetScripts)
			scripts.POST("", handlers.CreateScript)
			scripts.PUT("/:id", handlers.UpdateScript)
			scripts.DELETE("/:id", handlers.DeleteScript)
			scripts.POST("/:id/execute", handlers.ExecuteScript)
			scripts.GET("/:id/sessions", handlers.GetExecutionSessions)
			scripts.GET("/:id/logs", handlers.GetExecutionLogs)
		}

		// Ansible路由
		ansible := api.Group("/ansible")
		{
			ansible.GET("", handlers.GetAnsiblePlaybooks)
			ansible.POST("", handlers.CreateAnsiblePlaybook)
			ansible.PUT("/:id", handlers.UpdateAnsiblePlaybook)
			ansible.DELETE("/:id", handlers.DeleteAnsiblePlaybook)
			ansible.POST("/:id/execute", handlers.ExecuteAnsiblePlaybook)
			ansible.GET("/:id/sessions", handlers.GetAnsibleExecutionSessions)
			ansible.GET("/:id/logs", handlers.GetAnsibleExecutionLogs)
		}
	}

	log.Println("Server starting on :8080")
	r.Run(":8080")
}
