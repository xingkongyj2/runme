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
	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowCredentials: true,
	}))
	api := r.Group("/api")
	{
		// 无认证路由
		auth := api.Group("/auth")
		{
			auth.POST("/login", handlers.Login)
			auth.POST("/register", handlers.Register)
		}
		// 认证路由
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
			hostRoutes := protected.Group("/hosts")
			{
				hostRoutes.GET("/:id", handlers.GetHostByID)
				hostRoutes.POST("", handlers.CreateHost)
				hostRoutes.PUT("/:id", handlers.UpdateHost)
				hostRoutes.DELETE("/:id", handlers.DeleteHost)
				hostRoutes.GET("/:id/osinfo", handlers.GetHostOSInfo)
			}
			// 终端路由
			terminal := protected.Group("/terminal")
			{
				terminal.GET("/:hostId", handlers.HandleSSHTerminalByHostID)
			}
			// Shell脚本路由
			scriptRoutes := protected.Group("/scripts")
			{
				scriptRoutes.GET("", handlers.GetScripts)
				scriptRoutes.POST("", handlers.CreateScript)
				scriptRoutes.PUT("/:id", handlers.UpdateScript)
				scriptRoutes.DELETE("/:id", handlers.DeleteScript)
				scriptRoutes.POST("/:id/execute", handlers.ExecuteScript)
				scriptRoutes.POST("/:id/execute-experimental", handlers.ExecuteScriptExperimental)
				scriptRoutes.POST("/:id/continue-execution", handlers.ContinueScriptExecution)
				scriptRoutes.GET("/:id/sessions", handlers.GetExecutionSessions)
				scriptRoutes.GET("/:id/logs", handlers.GetExecutionLogs)
			}
			// Ansible路由
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
				monitoring.GET("/batch/system", handlers.GetBatchSystemInfo)
				monitoring.GET("/batch/processes", handlers.GetBatchProcessInfo)
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
			ai := api.Group("/ai")
			{
				ai.POST("/script-suggestion", handlers.GenerateScriptSuggestion)
			}
			// 证书管理路由
			certificates := protected.Group("/certificates")
			{
				certificates.GET("", handlers.GetCertificates)
				certificates.POST("", handlers.CreateCertificate)
				certificates.PUT("/:id", handlers.UpdateCertificate)
				certificates.DELETE("/:id", handlers.DeleteCertificate)
				certificates.POST("/:id/renew", handlers.RenewCertificate)
				certificates.POST("/:id/deploy", handlers.DeployCertificate)
				certificates.GET("/:id/download", handlers.DownloadCertificate)
				certificates.GET("/:id/logs", handlers.GetCertificateLogs)
			}
		}
	}
	log.Println("Server starting on :8080")
	r.Run(":8080")
}
