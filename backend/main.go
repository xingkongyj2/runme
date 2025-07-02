package main

import (
	"log"
	"runme-backend/database"
	"runme-backend/handlers"
	"runme-backend/middleware"

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
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowCredentials: true,
	}))

	// API路由组
	api := r.Group("/api")
	{
		// 认证路由（不需要JWT验证）
		auth := api.Group("/auth")
		{
			auth.POST("/login", handlers.Login)
			auth.POST("/register", handlers.Register) // 可选，用于注册
		}

		// 需要认证的路由
		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware())
		{
			// 用户信息路由
			protected.GET("/user", handlers.GetCurrentUser)

			// 主机组路由
			hostGroupRoutes := protected.Group("/hostgroups")
			{
				hostGroupRoutes.GET("", handlers.GetHostGroups)
				hostGroupRoutes.POST("", handlers.CreateHostGroup)
				hostGroupRoutes.PUT("/:id", handlers.UpdateHostGroup)
				hostGroupRoutes.DELETE("/:id", handlers.DeleteHostGroup)
				hostGroupRoutes.GET("/:groupId/hosts", handlers.GetHostsByGroupID)
			}

			// 主机路由
			hostRoutes := api.Group("/hosts")
			{
				hostRoutes.GET("/:id", handlers.GetHostByID)
				hostRoutes.POST("", handlers.CreateHost)
				hostRoutes.PUT("/:id", handlers.UpdateHost)
				hostRoutes.DELETE("/:id", handlers.DeleteHost)
			}

			// 终端路由 - 只支持主机ID
			api.GET("/terminal/:hostId", handlers.HandleSSHTerminalByHostID)

			// 脚本相关路由
			api.GET("/scripts", handlers.GetScripts)
			api.POST("/scripts", handlers.CreateScript)
			api.PUT("/scripts/:id", handlers.UpdateScript)
			api.DELETE("/scripts/:id", handlers.DeleteScript)
			api.POST("/scripts/:id/execute", handlers.ExecuteScript)
			api.POST("/scripts/:id/execute-experimental", handlers.ExecuteScriptExperimental)
			api.POST("/scripts/:id/continue-execution", handlers.ContinueScriptExecution)
			api.GET("/scripts/:id/sessions", handlers.GetExecutionSessions)
			api.GET("/scripts/:id/logs", handlers.GetExecutionLogs)

			// Ansible相关路由
			ansible := api.Group("/ansible")
			{
				ansible.GET("", handlers.GetAnsiblePlaybooks)
				ansible.POST("", handlers.CreateAnsiblePlaybook)
				ansible.PUT("/:id", handlers.UpdateAnsiblePlaybook)
				ansible.DELETE("/:id", handlers.DeleteAnsiblePlaybook)
				ansible.POST("/:id/execute", handlers.ExecuteAnsiblePlaybook)
				ansible.POST("/:id/execute-experimental", handlers.ExecuteAnsiblePlaybookExperimental)
				ansible.POST("/:id/continue-execution", handlers.ContinueAnsibleExecution)
				ansible.GET("/:id/sessions", handlers.GetAnsibleExecutionSessions)
				ansible.GET("/:id/logs", handlers.GetAnsibleExecutionLogs)
			}

			// 监控路由
			monitoring := api.Group("/monitoring")
			{
				monitoring.GET("/system/:groupId", handlers.GetSystemInfo)
				monitoring.GET("/processes/:groupId", handlers.GetProcessInfo)
			}

			// 部署路由
			deployment := api.Group("/deployment")
			{
				deployment.GET("", handlers.GetDeploymentTasks)
				deployment.POST("", handlers.CreateDeploymentTask)
				deployment.POST("/:id/execute", handlers.ExecuteDeploymentTask)
				deployment.GET("/:id/logs", handlers.GetDeploymentLogs)
				deployment.DELETE("/:id", handlers.DeleteDeploymentTask)
			}

			// AI建议路由
			api.POST("/ai/script-suggestion", handlers.GenerateScriptSuggestion)
		}
	}

	log.Println("Server starting on :8080")
	r.Run(":8080")
}
