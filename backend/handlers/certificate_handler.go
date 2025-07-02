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

// GetCertificates 获取所有证书
func GetCertificates(c *gin.Context) {
	rows, err := database.DB.Query(`
		SELECT id, name, domain, type, status, auto_renew, host_group_id, 
		       deploy_path, email, cert_path, key_path, issued_at, expires_at, 
		       created_at, updated_at 
		FROM certificates ORDER BY created_at DESC
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var certificates []models.Certificate
	for rows.Next() {
		var cert models.Certificate
		err := rows.Scan(
			&cert.ID, &cert.Name, &cert.Domain, &cert.Type, &cert.Status,
			&cert.AutoRenew, &cert.HostGroupID, &cert.DeployPath, &cert.Email,
			&cert.CertPath, &cert.KeyPath, &cert.IssuedAt, &cert.ExpiresAt,
			&cert.CreatedAt, &cert.UpdatedAt,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		certificates = append(certificates, cert)
	}

	c.JSON(http.StatusOK, certificates)
}

// CreateCertificate 创建证书
func CreateCertificate(c *gin.Context) {
	var cert models.Certificate
	if err := c.ShouldBindJSON(&cert); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	cert.Status = "pending"
	cert.CreatedAt = time.Now()
	cert.UpdatedAt = time.Now()

	result, err := database.DB.Exec(`
		INSERT INTO certificates 
		(name, domain, type, status, auto_renew, host_group_id, deploy_path, email, created_at, updated_at) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, cert.Name, cert.Domain, cert.Type, cert.Status, cert.AutoRenew,
		cert.HostGroupID, cert.DeployPath, cert.Email, cert.CreatedAt, cert.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	id, _ := result.LastInsertId()
	cert.ID = int(id)

	// 异步签发证书
	go services.IssueCertificate(&cert)

	c.JSON(http.StatusCreated, cert)
}

// RenewCertificate 续签证书
func RenewCertificate(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	// 获取证书信息
	var cert models.Certificate
	err = database.DB.QueryRow(`
		SELECT id, name, domain, type, status, auto_renew, host_group_id, 
		       deploy_path, email, cert_path, key_path, issued_at, expires_at, 
		       created_at, updated_at 
		FROM certificates WHERE id = ?
	`, id).Scan(
		&cert.ID, &cert.Name, &cert.Domain, &cert.Type, &cert.Status,
		&cert.AutoRenew, &cert.HostGroupID, &cert.DeployPath, &cert.Email,
		&cert.CertPath, &cert.KeyPath, &cert.IssuedAt, &cert.ExpiresAt,
		&cert.CreatedAt, &cert.UpdatedAt,
	)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Certificate not found"})
		return
	}

	// 异步续签证书
	go services.RenewCertificate(&cert)

	c.JSON(http.StatusOK, gin.H{"message": "Certificate renewal started"})
}

// DeployCertificate 部署证书
func DeployCertificate(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	// 获取证书信息
	var cert models.Certificate
	err = database.DB.QueryRow(`
		SELECT id, name, domain, type, status, auto_renew, host_group_id, 
		       deploy_path, email, cert_path, key_path, issued_at, expires_at, 
		       created_at, updated_at 
		FROM certificates WHERE id = ?
	`, id).Scan(
		&cert.ID, &cert.Name, &cert.Domain, &cert.Type, &cert.Status,
		&cert.AutoRenew, &cert.HostGroupID, &cert.DeployPath, &cert.Email,
		&cert.CertPath, &cert.KeyPath, &cert.IssuedAt, &cert.ExpiresAt,
		&cert.CreatedAt, &cert.UpdatedAt,
	)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Certificate not found"})
		return
	}

	// 异步部署证书
	go services.DeployCertificate(&cert)

	c.JSON(http.StatusOK, gin.H{"message": "Certificate deployment started"})
}

// GetCertificateLogs 获取证书操作日志
func GetCertificateLogs(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	rows, err := database.DB.Query(`
		SELECT id, certificate_id, action, status, message, output, error, created_at 
		FROM certificate_logs 
		WHERE certificate_id = ? 
		ORDER BY created_at DESC
	`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var logs []models.CertificateLog
	for rows.Next() {
		var log models.CertificateLog
		err := rows.Scan(
			&log.ID, &log.CertificateID, &log.Action, &log.Status,
			&log.Message, &log.Output, &log.Error, &log.CreatedAt,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		logs = append(logs, log)
	}

	c.JSON(http.StatusOK, logs)
}

// UpdateCertificate 更新证书
func UpdateCertificate(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var cert models.Certificate
	if err := c.ShouldBindJSON(&cert); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	cert.UpdatedAt = time.Now()

	_, err = database.DB.Exec(`
		UPDATE certificates 
		SET name=?, domain=?, type=?, auto_renew=?, host_group_id=?, deploy_path=?, email=?, updated_at=?
		WHERE id=?
	`, cert.Name, cert.Domain, cert.Type, cert.AutoRenew, cert.HostGroupID,
		cert.DeployPath, cert.Email, cert.UpdatedAt, id)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	cert.ID = id
	c.JSON(http.StatusOK, cert)
}

// DeleteCertificate 删除证书
func DeleteCertificate(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	// 检查证书是否存在
	var exists bool
	err = database.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM certificates WHERE id = ?)", id).Scan(&exists)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Certificate not found"})
		return
	}

	// 删除相关日志
	_, err = database.DB.Exec("DELETE FROM certificate_logs WHERE certificate_id = ?", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete certificate logs"})
		return
	}

	// 删除证书
	_, err = database.DB.Exec("DELETE FROM certificates WHERE id = ?", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Certificate deleted successfully"})
}

// DownloadCertificate 下载证书
func DownloadCertificate(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	// 获取证书信息
	var cert models.Certificate
	err = database.DB.QueryRow(`
		SELECT id, name, domain, cert_path, key_path, status
		FROM certificates WHERE id = ?
	`, id).Scan(&cert.ID, &cert.Name, &cert.Domain, &cert.CertPath, &cert.KeyPath, &cert.Status)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Certificate not found"})
		return
	}

	if cert.Status != "active" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Certificate is not active"})
		return
	}

	if cert.CertPath == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Certificate file not found"})
		return
	}

	// 设置下载响应头
	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Content-Disposition", "attachment; filename="+cert.Domain+".crt")
	c.Header("Content-Type", "application/octet-stream")

	// 返回证书文件
	c.File(cert.CertPath)
}
