package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// KimiRequest Kimi API请求结构
type KimiRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// KimiResponse Kimi API响应结构
type KimiResponse struct {
	Choices []Choice `json:"choices"`
}

type Choice struct {
	Message Message `json:"message"`
}

// AIScriptSuggestionRequest AI脚本建议请求
type AIScriptSuggestionRequest struct {
	Requirement string `json:"requirement"` // 用户需求描述
	Type        string `json:"type"`        // "shell" 或 "ansible"
}

// AIScriptSuggestionResponse AI脚本建议响应
type AIScriptSuggestionResponse struct {
	Name    string `json:"name"`    // 建议的脚本名称
	Content string `json:"content"` // 生成的脚本内容
	Message string `json:"message"` // 说明信息
}

// GenerateScriptSuggestion 生成脚本建议
func GenerateScriptSuggestion(c *gin.Context) {
	var req AIScriptSuggestionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Requirement == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "需求描述不能为空"})
		return
	}

	if req.Type != "shell" && req.Type != "ansible" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "类型必须是 shell 或 ansible"})
		return
	}

	// 构建提示词
	var prompt string
	if req.Type == "shell" {
		prompt = fmt.Sprintf(`你是一个专业的Shell脚本专家。用户需求：%s

请根据用户需求生成一个Shell脚本，要求：
1. 脚本要实用、安全、可靠
2. 包含必要的错误处理
3. 添加适当的注释
4. 遵循Shell脚本最佳实践

请按以下JSON格式返回：
{
  "name": "脚本名称",
  "content": "#!/bin/bash\n脚本内容",
  "message": "脚本说明"
}

只返回JSON，不要其他内容。`, req.Requirement)
	} else {
		prompt = fmt.Sprintf(`你是一个专业的Ansible专家。用户需求：%s

请根据用户需求生成一个Ansible Playbook，要求：
1. 使用标准的YAML格式
2. 包含适当的任务描述
3. 考虑幂等性和错误处理
4. 遵循Ansible最佳实践

请按以下JSON格式返回：
{
  "name": "Playbook名称",
  "content": "---\n- name: 任务描述\n  hosts: all\n  tasks:\n    - name: 具体任务\n      ...",
  "message": "Playbook说明"
}

只返回JSON，不要其他内容。`, req.Requirement)
	}

	// 调用Kimi API
	response, err := callKimiAPI(prompt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("AI服务调用失败: %v", err)})
		return
	}

	// 解析响应
	var suggestion AIScriptSuggestionResponse
	if err := json.Unmarshal([]byte(response), &suggestion); err != nil {
		// 如果JSON解析失败，尝试提取内容
		suggestion = AIScriptSuggestionResponse{
			Name:    fmt.Sprintf("%s脚本", req.Type),
			Content: response,
			Message: "AI生成的脚本内容",
		}
	}

	c.JSON(http.StatusOK, suggestion)
}

// callKimiAPI 调用Kimi API
func callKimiAPI(prompt string) (string, error) {
	// Kimi API配置
	apiURL := "https://api.moonshot.cn/v1/chat/completions"
	apiKey := "sk-your-kimi-api-key" // 需要替换为实际的API Key

	// 构建请求
	reqBody := KimiRequest{
		Model: "moonshot-v1-8k",
		Messages: []Message{
			{
				Role:    "user",
				Content: prompt,
			},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	// 创建HTTP请求
	req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	// 发送请求
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API请求失败: %s", string(body))
	}

	// 解析响应
	var kimiResp KimiResponse
	if err := json.Unmarshal(body, &kimiResp); err != nil {
		return "", err
	}

	if len(kimiResp.Choices) == 0 {
		return "", fmt.Errorf("AI响应为空")
	}

	return strings.TrimSpace(kimiResp.Choices[0].Message.Content), nil
}
