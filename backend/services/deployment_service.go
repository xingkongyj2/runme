package services

import (
	"fmt"
	"log"
	"runme-backend/database"
	"runme-backend/models"
	"strings"
	"time"
)

// DeployProject 部署项目到主机组
func DeployProject(task *models.DeploymentTask) error {
	// 更新任务状态为运行中
	_, err := database.DB.Exec("UPDATE deployment_tasks SET status = 'running', updated_at = ? WHERE id = ?",
		time.Now(), task.ID)
	if err != nil {
		return err
	}

	// 获取主机组下的所有主机（包含认证信息）
	rows, err := database.DB.Query("SELECT ip, port, username, password FROM hosts WHERE host_group_id = ?", task.HostGroupID)
	if err != nil {
		return err
	}
	defer rows.Close()

	var hosts []models.Host
	for rows.Next() {
		var host models.Host
		if err := rows.Scan(&host.IP, &host.Port, &host.Username, &host.Password); err != nil {
			continue
		}
		hosts = append(hosts, host)
	}

	// 如果没有主机，检查hosts字段（兼容旧数据）
	if len(hosts) == 0 {
		var hostsStr string
		err = database.DB.QueryRow("SELECT hosts FROM host_groups WHERE id = ?", task.HostGroupID).Scan(&hostsStr)
		if err == nil && hostsStr != "" {
			// 对于旧数据，使用默认认证信息
			hostIPs := strings.Split(hostsStr, ",")
			for _, ip := range hostIPs {
				ip = strings.TrimSpace(ip)
				if ip != "" {
					hosts = append(hosts, models.Host{
						IP:       ip,
						Port:     22,
						Username: "root", // 默认用户名
						Password: "",     // 需要配置默认密码或使用密钥
					})
				}
			}
		}
	}

	allSuccess := true
	// 对每个主机执行部署
	for _, host := range hosts {
		log.Printf("Deploying to host: %s", host.IP)

		// 记录部署开始
		_, err := database.DB.Exec(`
			INSERT INTO deployment_logs (task_id, host, status, output, deployed_at) 
			VALUES (?, ?, 'running', 'Starting deployment...', ?)
		`, task.ID, host.IP, time.Now())
		if err != nil {
			log.Printf("Failed to insert deployment log: %v", err)
		}

		// 执行部署脚本
		output, deployErr := executeDeploymentScript(host, task)

		status := "success"
		errorMsg := ""
		if deployErr != nil {
			status = "failed"
			errorMsg = deployErr.Error()
			allSuccess = false
		}

		// 更新部署日志
		_, err = database.DB.Exec(`
			UPDATE deployment_logs 
			SET status = ?, output = ?, error = ?, deployed_at = ?
			WHERE task_id = ? AND host = ? AND status = 'running'
		`, status, output, errorMsg, time.Now(), task.ID, host.IP)
		if err != nil {
			log.Printf("Failed to update deployment log: %v", err)
		}
	}

	// 更新任务最终状态
	finalStatus := "success"
	if !allSuccess {
		finalStatus = "failed"
	}

	_, err = database.DB.Exec("UPDATE deployment_tasks SET status = ?, updated_at = ? WHERE id = ?",
		finalStatus, time.Now(), task.ID)
	if err != nil {
		return err
	}

	return nil
}

// executeDeploymentScript 执行部署脚本
func executeDeploymentScript(host models.Host, task *models.DeploymentTask) (string, error) {
	// 生成部署脚本
	script := generateDeploymentScript(task)

	// 使用SSH服务执行脚本
	output, err := ExecuteSSHCommand(host.IP, host.Username, host.Password, host.Port, script)
	if err != nil {
		return output, fmt.Errorf("deployment failed: %v", err)
	}

	return output, nil
}

// generateDeploymentScript 生成部署脚本
func generateDeploymentScript(task *models.DeploymentTask) string {
	projectName := getProjectNameFromURL(task.GithubURL)
	deployPath := fmt.Sprintf("/opt/deployments/%s", projectName)

	script := fmt.Sprintf(`#!/bin/bash
set -e

# 创建部署目录
sudo mkdir -p %s
cd %s

# 检查是否已存在项目目录
if [ -d "%s" ]; then
    echo "Project directory exists, pulling latest changes..."
    cd %s
    git pull origin %s
else
    echo "Cloning repository..."
    git clone -b %s %s %s
    cd %s
fi

# 检查是否存在package.json（Node.js项目）
if [ -f "package.json" ]; then
    echo "Detected Node.js project, installing dependencies..."
    npm install
    
    # 检查是否有build脚本
    if npm run | grep -q "build"; then
        echo "Building project..."
        npm run build
    fi
    
    # 检查是否有start脚本
    if npm run | grep -q "start"; then
        echo "Starting application..."
        # 停止可能运行的进程
        pkill -f "node.*%s" || true
        # 后台启动应用
        nohup npm start > /var/log/%s.log 2>&1 &
        echo "Application started"
    fi
elif [ -f "requirements.txt" ]; then
    echo "Detected Python project, installing dependencies..."
    pip3 install -r requirements.txt
    
    # 检查是否存在main.py或app.py
    if [ -f "main.py" ]; then
        echo "Starting Python application..."
        pkill -f "python.*main.py" || true
        nohup python3 main.py > /var/log/%s.log 2>&1 &
    elif [ -f "app.py" ]; then
        echo "Starting Python application..."
        pkill -f "python.*app.py" || true
        nohup python3 app.py > /var/log/%s.log 2>&1 &
    fi
elif [ -f "go.mod" ]; then
    echo "Detected Go project, building..."
    go build -o %s
    
    # 停止可能运行的进程
    pkill -f "%s" || true
    # 启动应用
    nohup ./%s > /var/log/%s.log 2>&1 &
    echo "Go application started"
elif [ -f "Dockerfile" ]; then
    echo "Detected Docker project, building and running..."
    # 停止并删除旧容器
    docker stop %s || true
    docker rm %s || true
    
    # 构建新镜像
    docker build -t %s .
    
    # 运行容器
    docker run -d --name %s -p 8080:8080 %s
    echo "Docker container started"
else
    echo "Project type not recognized, deployment completed"
fi

echo "Deployment finished successfully"
`,
		deployPath, deployPath, projectName, projectName, task.Branch,
		task.Branch, task.GithubURL, projectName, projectName,
		projectName, projectName, projectName, projectName,
		projectName, projectName, projectName, projectName,
		projectName, projectName, projectName, projectName, projectName)

	return script
}

// getProjectNameFromURL 从GitHub URL提取项目名
func getProjectNameFromURL(url string) string {
	// 移除.git后缀
	url = strings.TrimSuffix(url, ".git")
	// 获取最后一个/后的内容
	parts := strings.Split(url, "/")
	if len(parts) > 0 {
		return parts[len(parts)-1]
	}
	return "unknown-project"
}
