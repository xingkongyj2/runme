package services

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runme-backend/models"
	"strings"
)

// ExecuteAnsiblePlaybook 在当前机器上执行Ansible Playbook，连接到多台目标主机
func ExecuteAnsiblePlaybook(hosts []models.Host, playbookContent, variables string) (string, error) {
	// 创建临时目录
	tempDir, err := os.MkdirTemp("", "ansible_*")
	if err != nil {
		return "", fmt.Errorf("failed to create temp directory: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// 创建inventory文件，包含所有主机
	inventoryPath := filepath.Join(tempDir, "inventory")
	var inventoryContent strings.Builder
	inventoryContent.WriteString("[targets]\n")

	for i, host := range hosts {
		inventoryContent.WriteString(fmt.Sprintf(
			"%s ansible_host=%s ansible_user=%s ansible_password=%s ansible_port=%d ansible_ssh_common_args='-o StrictHostKeyChecking=no'\n",
			fmt.Sprintf("host%d", i+1), host.IP, host.Username, host.Password, host.Port,
		))
	}

	err = os.WriteFile(inventoryPath, []byte(inventoryContent.String()), 0644)
	if err != nil {
		return "", fmt.Errorf("failed to create inventory file: %v", err)
	}

	// 创建playbook文件，确保hosts设置为all或targets
	playbookPath := filepath.Join(tempDir, "playbook.yml")

	// 如果playbook中没有指定hosts，自动添加hosts: targets
	processedPlaybook := playbookContent
	if !strings.Contains(playbookContent, "hosts:") {
		// 在playbook开头添加hosts配置
		lines := strings.Split(playbookContent, "\n")
		if len(lines) > 0 && strings.HasPrefix(lines[0], "---") {
			// 如果有YAML开头标记，在第二行插入
			processedPlaybook = lines[0] + "\n- hosts: targets\n" + strings.Join(lines[1:], "\n")
		} else {
			// 否则在开头插入
			processedPlaybook = "- hosts: targets\n" + playbookContent
		}
	}

	err = os.WriteFile(playbookPath, []byte(processedPlaybook), 0644)
	if err != nil {
		return "", fmt.Errorf("failed to create playbook file: %v", err)
	}

	// 如果有变量，创建变量文件
	var varsFile string
	if variables != "" {
		varsPath := filepath.Join(tempDir, "vars.yml")
		err = os.WriteFile(varsPath, []byte(variables), 0644)
		if err != nil {
			return "", fmt.Errorf("failed to create vars file: %v", err)
		}
		varsFile = fmt.Sprintf("-e @%s", varsPath)
	}

	// 构建ansible-playbook命令
	cmdArgs := []string{
		"-i", inventoryPath,
		playbookPath,
		"--timeout=30",
		"-v", // 增加详细输出
	}

	if varsFile != "" {
		cmdArgs = append(cmdArgs, strings.Split(varsFile, " ")...)
	}

	// 执行命令
	cmd := exec.Command("ansible-playbook", cmdArgs...)
	cmd.Env = append(os.Environ(),
		"ANSIBLE_HOST_KEY_CHECKING=False",
		"ANSIBLE_TIMEOUT=30",
		"ANSIBLE_SSH_RETRIES=3",
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return string(output), fmt.Errorf("ansible-playbook execution failed: %v", err)
	}

	return string(output), nil
}

// ExecuteAnsiblePlaybookSingleHost 为单个主机执行Ansible Playbook（保持向后兼容）
func ExecuteAnsiblePlaybookSingleHost(host, username, password string, port int, playbookContent, variables string) (string, error) {
	hosts := []models.Host{
		{
			IP:       host,
			Username: username,
			Password: password,
			Port:     port,
		},
	}
	return ExecuteAnsiblePlaybook(hosts, playbookContent, variables)
}
