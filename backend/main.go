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
		// 终端路由（不需要身份验证，因为WebSocket难以传递token）
		terminal := api.Group("/terminal")
		{
			terminal.GET("/:hostId", handlers.HandleSSHTerminalByHostID)
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
				hostGroupRoutes.POST("/:groupId/ping", handlers.PingHostsByGroup)
			}
			// 主机路由
			hostRoutes := protected.Group("/hosts")
			{
				hostRoutes.GET("/:id", handlers.GetHostByID)
				hostRoutes.POST("", handlers.CreateHost)
				hostRoutes.PUT("/:id", handlers.UpdateHost)
				hostRoutes.DELETE("/:id", handlers.DeleteHost)
				hostRoutes.GET("/:id/osinfo", handlers.GetHostOSInfo)
				hostRoutes.POST("/:id/ping", handlers.PingHost)
			}
			// Shell脚本路由
			scriptRoutes := protected.Group("/scripts")
			{
				scriptRoutes.GET("", handlers.GetScripts)
				scriptRoutes.POST("", handlers.CreateScript)
				scriptRoutes.PUT("/:id", handlers.UpdateScript)
				scriptRoutes.DELETE("/:id", handlers.DeleteScript)
				scriptRoutes.POST("/:id/execute", handlers.ExecuteScript)
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
				ansible.GET("/:id/sessions", handlers.GetAnsibleExecutionSessions)
				ansible.GET("/:id/logs", handlers.GetAnsibleExecutionLogs)
			}
			// 监控路由
			monitoring := api.Group("/monitoring")
			{
				monitoring.GET("/batch/system", handlers.GetBatchSystemInfo)
			}
			// 部署路由
			deployment := api.Group("/deployment")
			{
				deployment.GET("", handlers.GetDeploymentTasks)
				deployment.POST("", handlers.CreateDeploymentTask)
				deployment.PUT("/:id", handlers.UpdateDeploymentTask)
				deployment.POST("/:id/execute", handlers.ExecuteDeploymentTask)
				deployment.GET("/:id/sessions", handlers.GetDeploymentSessions)
				deployment.GET("/:id/logs", handlers.GetDeploymentLogsBySession)
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
			// Docker模板管理路由
			dockerTemplates := protected.Group("/docker-templates")
			{
				dockerTemplates.GET("", handlers.GetDockerTemplates)
				dockerTemplates.GET("/:id", handlers.GetDockerTemplate)
				dockerTemplates.POST("", handlers.CreateDockerTemplate)
				dockerTemplates.PUT("/:id", handlers.UpdateDockerTemplate)
				dockerTemplates.DELETE("/:id", handlers.DeleteDockerTemplate)
				dockerTemplates.POST("/:id/execute", handlers.ExecuteDockerTemplate)
			}
		}
	}

	// 添加静态文件服务
	r.Static("/static", "/app/frontend/static")
	r.StaticFile("/favicon.ico", "/app/frontend/favicon.ico")
	r.StaticFile("/favicon.svg", "/app/frontend/favicon.svg")
	r.StaticFile("/manifest.json", "/app/frontend/manifest.json")

	// 添加构建后的静态资源
	r.Static("/assets", "/app/frontend/assets")

	// 处理前端路由 - 对于所有非API路由，返回index.html（SPA支持）
	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path

		// 如果是API路由，返回404
		if len(path) >= 4 && path[:4] == "/api" {
			c.JSON(404, gin.H{"error": "API endpoint not found"})
			return
		}

		// 如果是静态资源请求，返回404
		if len(path) >= 7 && path[:7] == "/static" ||
			len(path) >= 7 && path[:7] == "/assets" ||
			path == "/favicon.ico" ||
			path == "/favicon.svg" ||
			path == "/manifest.json" {
			c.Status(404)
			return
		}

		// 否则返回前端index.html（SPA路由支持）
		c.Header("Content-Type", "text/html")
		c.File("/app/frontend/index.html")
	})

	log.Println("Server starting on :20002")
	r.Run(":20002")
}
