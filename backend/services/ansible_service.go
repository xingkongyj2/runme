package services

import (
	"fmt"
	"io/ioutil"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// ExecuteAnsiblePlaybook 执行Ansible Playbook
func ExecuteAnsiblePlaybook(host, username, password string, port int, playbookContent, variables string) (string, error) {
	// 创建临时目录
	tempDir, err := ioutil.TempDir("", "ansible_*")
	if err != nil {
		return "", fmt.Errorf("failed to create temp directory: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// 创建inventory文件
	inventoryPath := filepath.Join(tempDir, "inventory")
	inventoryContent := fmt.Sprintf(`[targets]
%s ansible_user=%s ansible_password=%s ansible_port=%d ansible_ssh_common_args='-o StrictHostKeyChecking=no'`, host, username, password, port)
	err = ioutil.WriteFile(inventoryPath, []byte(inventoryContent), 0644)
	if err != nil {
		return "", fmt.Errorf("failed to create inventory file: %v", err)
	}

	// 创建playbook文件
	playbookPath := filepath.Join(tempDir, "playbook.yml")
	err = ioutil.WriteFile(playbookPath, []byte(playbookContent), 0644)
	if err != nil {
		return "", fmt.Errorf("failed to create playbook file: %v", err)
	}

	// 如果有变量，创建变量文件
	var varsFile string
	if variables != "" {
		varsPath := filepath.Join(tempDir, "vars.yml")
		err = ioutil.WriteFile(varsPath, []byte(variables), 0644)
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
	}

	if varsFile != "" {
		cmdArgs = append(cmdArgs, strings.Split(varsFile, " ")...)
	}

	// 执行命令
	cmd := exec.Command("ansible-playbook", cmdArgs...)
	cmd.Env = append(os.Environ(),
		"ANSIBLE_HOST_KEY_CHECKING=False",
		"ANSIBLE_TIMEOUT=30",
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return string(output), fmt.Errorf("ansible-playbook execution failed: %v", err)
	}

	return string(output), nil
}
