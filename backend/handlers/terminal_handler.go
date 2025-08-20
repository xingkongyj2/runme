package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"runme-backend/database"
	"runme-backend/models"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"golang.org/x/crypto/ssh"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // 允许跨域
	},
}

type TerminalMessage struct {
	Type string `json:"type"`
	Data string `json:"data"`
}

type SSHTerminal struct {
	conn      *websocket.Conn
	sshClient *ssh.Client
	session   *ssh.Session
	stdin     io.WriteCloser
	stdout    io.Reader
}

// HandleSSHTerminal 处理SSH终端WebSocket连接（旧版本，通过主机组ID和IP）
func HandleSSHTerminal(c *gin.Context) {
	// 获取参数
	hostGroupID := c.Param("hostGroupId")
	hostIP := c.Query("host")

	if hostGroupID == "" || hostIP == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少必要参数"})
		return
	}

	// 查询主机组信息
	id, err := strconv.Atoi(hostGroupID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的主机组ID"})
		return
	}

	var username, password string
	var port int
	err = database.DB.QueryRow("SELECT username, password, port FROM host_groups WHERE id = ?", id).Scan(&username, &password, &port)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "主机组不存在"})
		return
	}

	// 升级为WebSocket连接
	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket升级失败: %v", err)
		return
	}
	defer ws.Close()

	// 创建SSH连接
	terminal := &SSHTerminal{conn: ws}
	err = terminal.connectSSH(hostIP, username, password, port)
	if err != nil {
		terminal.sendMessage("error", fmt.Sprintf("SSH连接失败: %v", err))
		return
	}
	defer terminal.close()

	// 发送连接成功消息
	terminal.sendMessage("connected", fmt.Sprintf("已连接到 %s", hostIP))

	// 启动数据传输
	terminal.handleTerminal()
}

// HandleSSHTerminalByHostID 通过主机ID处理SSH终端连接
func HandleSSHTerminalByHostID(c *gin.Context) {
	hostIDStr := c.Param("hostId")
	hostID, err := strconv.Atoi(hostIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid host ID"})
		return
	}

	// 获取主机信息
	var host models.Host
	err = database.DB.QueryRow(`
		SELECT id, ip, port, username, password, host_group_id 
		FROM hosts 
		WHERE id = ?
	`, hostID).Scan(&host.ID, &host.IP, &host.Port, &host.Username, &host.Password, &host.HostGroupID)

	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Host not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch host info"})
		}
		return
	}

	// 升级WebSocket连接
	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade websocket: %v", err)
		return
	}
	defer ws.Close()

	// 创建SSH连接
	terminal := &SSHTerminal{conn: ws}
	err = terminal.connectSSH(host.IP, host.Username, host.Password, host.Port)
	if err != nil {
		terminal.sendMessage("error", fmt.Sprintf("SSH连接失败: %v", err))
		return
	}
	defer terminal.close()

	// 发送连接成功信号（不显示额外消息，让SSH原始输出正常显示）
	terminal.sendMessage("connected", "")

	// 启动数据传输
	terminal.handleTerminal()
}

func (t *SSHTerminal) connectSSH(host, username, password string, port int) error {
	// SSH客户端配置
	config := &ssh.ClientConfig{
		User: username,
		Auth: []ssh.AuthMethod{
			ssh.Password(password),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         30 * time.Second,
	}

	// 连接SSH服务器
	addr := net.JoinHostPort(host, strconv.Itoa(port))
	client, err := ssh.Dial("tcp", addr, config)
	if err != nil {
		return err
	}
	t.sshClient = client

	// 创建SSH会话
	session, err := client.NewSession()
	if err != nil {
		return err
	}
	t.session = session

	// 设置终端模式
	modes := ssh.TerminalModes{
		ssh.ECHO:          1,
		ssh.TTY_OP_ISPEED: 14400,
		ssh.TTY_OP_OSPEED: 14400,
	}

	// 请求伪终端 - 使用前端设置的尺寸
	err = session.RequestPty("xterm-256color", 120, 30, modes)
	if err != nil {
		return err
	}

	// 获取stdin和stdout
	stdin, err := session.StdinPipe()
	if err != nil {
		return err
	}
	t.stdin = stdin

	stdout, err := session.StdoutPipe()
	if err != nil {
		return err
	}
	t.stdout = stdout

	// 启动shell
	err = session.Shell()
	if err != nil {
		return err
	}

	return nil
}

func (t *SSHTerminal) handleTerminal() {
	// 启动goroutine读取SSH输出并发送到WebSocket
	go func() {
		buf := make([]byte, 4096) // 增大缓冲区
		for {
			n, err := t.stdout.Read(buf)
			if err != nil {
				if err != io.EOF {
					log.Printf("读取SSH输出错误: %v", err)
				}
				return
			}
			if n > 0 {
				// 直接发送原始数据，不做任何处理
				t.sendMessage("data", string(buf[:n]))
			}
		}
	}()

	// 读取WebSocket消息并发送到SSH
	for {
		var msg TerminalMessage
		err := t.conn.ReadJSON(&msg)
		if err != nil {
			log.Printf("读取WebSocket消息错误: %v", err)
			break
		}

		switch msg.Type {
		case "input":
			_, err = t.stdin.Write([]byte(msg.Data))
			if err != nil {
				log.Printf("写入SSH输入错误: %v", err)
				return
			}
		case "resize":
			// 处理终端大小调整
			var size struct {
				Cols int `json:"cols"`
				Rows int `json:"rows"`
			}
			err = json.Unmarshal([]byte(msg.Data), &size)
			if err == nil {
				t.session.WindowChange(size.Rows, size.Cols)
			}
		}
	}
}

func (t *SSHTerminal) sendMessage(msgType, data string) {
	msg := TerminalMessage{
		Type: msgType,
		Data: data,
	}
	err := t.conn.WriteJSON(msg)
	if err != nil {
		log.Printf("发送WebSocket消息错误: %v", err)
	}
}

func (t *SSHTerminal) close() {
	if t.session != nil {
		t.session.Close()
	}
	if t.sshClient != nil {
		t.sshClient.Close()
	}
}
