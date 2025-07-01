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
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowCredentials: true,
	}))

	// API路由组
	api := r.Group("/api")
	{
		// 主机组路由
		hostGroupRoutes := api.Group("/hostgroups")
		{
			hostGroupRoutes.GET("", handlers.GetHostGroups)
			hostGroupRoutes.POST("", handlers.CreateHostGroup)
			hostGroupRoutes.PUT("/:id", handlers.UpdateHostGroup)
			hostGroupRoutes.DELETE("/:id", handlers.DeleteHostGroup)

			// 主机相关路由
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

		// 终端路由
		api.GET("/terminal/:hostId", handlers.HandleSSHTerminalByHostID)

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

		// SSH终端路由
		api.GET("/terminal/:hostGroupId", handlers.HandleSSHTerminal)
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
	}

	log.Println("Server starting on :8080")
	r.Run(":8080")
}
