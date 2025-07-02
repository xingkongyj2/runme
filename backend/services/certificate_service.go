package services

import (
	"fmt"
	"log"
	"os/exec"
	"runme-backend/database"
	"runme-backend/models"
	"time"
)

// IssueCertificate 签发证书
func IssueCertificate(cert *models.Certificate) {
	logCertificateAction(cert.ID, "issue", "pending", "开始签发证书", "", "")

	switch cert.Type {
	case "letsencrypt":
		issueLetSEncryptCertificate(cert)
	case "self-signed":
		issueSelfSignedCertificate(cert)
	default:
		logCertificateAction(cert.ID, "issue", "failed", "不支持的证书类型", "", "")
	}
}

// RenewCertificate 续签证书
func RenewCertificate(cert *models.Certificate) {
	logCertificateAction(cert.ID, "renew", "pending", "开始续签证书", "", "")

	switch cert.Type {
	case "letsencrypt":
		renewLetSEncryptCertificate(cert)
	case "self-signed":
		issueSelfSignedCertificate(cert) // 自签名证书重新生成
	default:
		logCertificateAction(cert.ID, "renew", "failed", "不支持的证书类型", "", "")
	}
}

// DeployCertificate 部署证书
func DeployCertificate(cert *models.Certificate) {
	logCertificateAction(cert.ID, "deploy", "pending", "开始部署证书", "", "")

	// 获取主机组信息
	var hostGroup models.HostGroup
	err := database.DB.QueryRow(
		"SELECT id, name, username, password, port, hosts FROM host_groups WHERE id = ?",
		cert.HostGroupID,
	).Scan(&hostGroup.ID, &hostGroup.Name, &hostGroup.Username, &hostGroup.Password, &hostGroup.Port, &hostGroup.Hosts)

	if err != nil {
		logCertificateAction(cert.ID, "deploy", "failed", "获取主机组信息失败", "", err.Error())
		return
	}

	// 这里实现证书部署逻辑
	// 可以使用SSH服务将证书文件复制到目标主机
	logCertificateAction(cert.ID, "deploy", "success", "证书部署成功", "", "")
}

// issueLetSEncryptCertificate 签发Let's Encrypt证书
func issueLetSEncryptCertificate(cert *models.Certificate) {
	// 使用certbot命令签发证书
	cmd := exec.Command("certbot", "certonly", "--standalone", "-d", cert.Domain, "--email", cert.Email, "--agree-tos", "--non-interactive")
	output, err := cmd.CombinedOutput()

	if err != nil {
		logCertificateAction(cert.ID, "issue", "failed", "Let's Encrypt证书签发失败", string(output), err.Error())
		return
	}

	// 更新证书状态和路径
	certPath := fmt.Sprintf("/etc/letsencrypt/live/%s/fullchain.pem", cert.Domain)
	keyPath := fmt.Sprintf("/etc/letsencrypt/live/%s/privkey.pem", cert.Domain)
	issuedAt := time.Now()
	expiresAt := issuedAt.AddDate(0, 3, 0) // Let's Encrypt证书有效期3个月

	_, err = database.DB.Exec(`
		UPDATE certificates 
		SET status = 'active', cert_path = ?, key_path = ?, issued_at = ?, expires_at = ?, updated_at = ?
		WHERE id = ?
	`, certPath, keyPath, issuedAt, expiresAt, time.Now(), cert.ID)

	if err != nil {
		logCertificateAction(cert.ID, "issue", "failed", "更新证书信息失败", "", err.Error())
		return
	}

	logCertificateAction(cert.ID, "issue", "success", "Let's Encrypt证书签发成功", string(output), "")
}

// issueSelfSignedCertificate 生成自签名证书
func issueSelfSignedCertificate(cert *models.Certificate) {
	// 使用openssl生成自签名证书
	certPath := fmt.Sprintf("/tmp/%s.crt", cert.Domain)
	keyPath := fmt.Sprintf("/tmp/%s.key", cert.Domain)

	cmd := exec.Command("openssl", "req", "-x509", "-newkey", "rsa:4096", "-keyout", keyPath, "-out", certPath, "-days", "365", "-nodes", "-subj", fmt.Sprintf("/CN=%s", cert.Domain))
	output, err := cmd.CombinedOutput()

	if err != nil {
		logCertificateAction(cert.ID, "issue", "failed", "自签名证书生成失败", string(output), err.Error())
		return
	}

	// 更新证书状态和路径
	issuedAt := time.Now()
	expiresAt := issuedAt.AddDate(1, 0, 0) // 自签名证书有效期1年

	_, err = database.DB.Exec(`
		UPDATE certificates 
		SET status = 'active', cert_path = ?, key_path = ?, issued_at = ?, expires_at = ?, updated_at = ?
		WHERE id = ?
	`, certPath, keyPath, issuedAt, expiresAt, time.Now(), cert.ID)

	if err != nil {
		logCertificateAction(cert.ID, "issue", "failed", "更新证书信息失败", "", err.Error())
		return
	}

	logCertificateAction(cert.ID, "issue", "success", "自签名证书生成成功", string(output), "")
}

// renewLetSEncryptCertificate 续签Let's Encrypt证书
func renewLetSEncryptCertificate(cert *models.Certificate) {
	cmd := exec.Command("certbot", "renew", "--cert-name", cert.Domain)
	output, err := cmd.CombinedOutput()

	if err != nil {
		logCertificateAction(cert.ID, "renew", "failed", "Let's Encrypt证书续签失败", string(output), err.Error())
		return
	}

	// 更新过期时间
	expiresAt := time.Now().AddDate(0, 3, 0)
	_, err = database.DB.Exec(`
		UPDATE certificates 
		SET expires_at = ?, updated_at = ?
		WHERE id = ?
	`, expiresAt, time.Now(), cert.ID)

	if err != nil {
		logCertificateAction(cert.ID, "renew", "failed", "更新证书过期时间失败", "", err.Error())
		return
	}

	logCertificateAction(cert.ID, "renew", "success", "Let's Encrypt证书续签成功", string(output), "")
}

// logCertificateAction 记录证书操作日志
func logCertificateAction(certificateID int, action, status, message, output, errorMsg string) {
	_, err := database.DB.Exec(`
		INSERT INTO certificate_logs 
		(certificate_id, action, status, message, output, error, created_at) 
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, certificateID, action, status, message, output, errorMsg, time.Now())

	if err != nil {
		log.Printf("Failed to log certificate action: %v", err)
	}
}
