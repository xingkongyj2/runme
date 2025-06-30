package services

import (
	"fmt"
	"net"
	"strings"
	"time"

	"golang.org/x/crypto/ssh"
)

type SSHClient struct {
	Host     string
	Username string
	Password string
}

type ExecutionResult struct {
	Host   string
	Status string
	Output string
	Error  string
}

func NewSSHClient(host, username, password string) *SSHClient {
	return &SSHClient{
		Host:     host,
		Username: username,
		Password: password,
	}
}

func (c *SSHClient) ExecuteScript(script string) ExecutionResult {
	result := ExecutionResult{
		Host:   c.Host,
		Status: "failed",
	}

	// SSH配置
	config := &ssh.ClientConfig{
		User: c.Username,
		Auth: []ssh.AuthMethod{
			ssh.Password(c.Password),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         30 * time.Second,
	}

	// 连接SSH
	conn, err := ssh.Dial("tcp", net.JoinHostPort(c.Host, "22"), config)
	if err != nil {
		result.Error = fmt.Sprintf("Failed to connect: %v", err)
		return result
	}
	defer conn.Close()

	// 创建会话
	session, err := conn.NewSession()
	if err != nil {
		result.Error = fmt.Sprintf("Failed to create session: %v", err)
		return result
	}
	defer session.Close()

	// 执行脚本
	output, err := session.CombinedOutput(script)
	if err != nil {
		result.Error = fmt.Sprintf("Script execution failed: %v", err)
		result.Output = string(output)
		return result
	}

	result.Status = "success"
	result.Output = string(output)
	return result
}

func ExecuteScriptOnHosts(hosts []string, username, password, script string) []ExecutionResult {
	results := make([]ExecutionResult, 0, len(hosts))
	resultChan := make(chan ExecutionResult, len(hosts))

	// 并发执行
	for _, host := range hosts {
		go func(h string) {
			client := NewSSHClient(h, username, password)
			result := client.ExecuteScript(script)
			resultChan <- result
		}(strings.TrimSpace(host))
	}

	// 收集结果
	for i := 0; i < len(hosts); i++ {
		results = append(results, <-resultChan)
	}

	return results
}
