package services

import (
	"fmt"
	"net"
	"runme-backend/models"
	"strconv"
	"strings"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
	gopsutilNet "github.com/shirou/gopsutil/v3/net"
	"github.com/shirou/gopsutil/v3/process"
	"golang.org/x/crypto/ssh"
)

// GetHostSystemInfo 获取主机系统信息
func GetHostSystemInfo(host, username, password string, port int) models.SystemInfo {
	sshPort := "22"
	if port != 0 {
		sshPort = strconv.Itoa(port)
	}

	systemInfo := models.SystemInfo{
		IP:          host,
		Status:      "offline",
		LastUpdated: time.Now(),
	}

	// 通过SSH连接到远程主机并执行gopsutil命令
	config := &ssh.ClientConfig{
		User: username,
		Auth: []ssh.AuthMethod{
			ssh.Password(password),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         10 * time.Second,
	}

	conn, err := ssh.Dial("tcp", net.JoinHostPort(host, sshPort), config)
	if err != nil {
		return systemInfo
	}
	defer conn.Close()

	systemInfo.Status = "online"

	// 获取CPU使用率
	if cpuPercent, err := getRemoteCPUPercent(conn); err == nil {
		systemInfo.CPUUsage = cpuPercent
	}

	// 获取内存使用率
	if memPercent, err := getRemoteMemoryPercent(conn); err == nil {
		systemInfo.MemoryUsage = memPercent
	}

	// 获取磁盘使用率
	if diskPercent, err := getRemoteDiskPercent(conn); err == nil {
		systemInfo.DiskUsage = diskPercent
	}

	// 获取网络信息
	if networkTx, networkRx, err := getRemoteNetworkInfo(conn); err == nil {
		systemInfo.NetworkTx = networkTx
		systemInfo.NetworkRx = networkRx
	}

	// 获取开放端口
	if ports, err := getRemoteOpenPorts(conn); err == nil {
		systemInfo.Ports = ports
	}

	return systemInfo
}

// GetHostProcessInfo 获取主机进程信息
func GetHostProcessInfo(host, username, password string, port int) []models.ProcessInfo {
	sshPort := "22"
	if port != 0 {
		sshPort = strconv.Itoa(port)
	}

	var processes []models.ProcessInfo

	config := &ssh.ClientConfig{
		User: username,
		Auth: []ssh.AuthMethod{
			ssh.Password(password),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         10 * time.Second,
	}

	conn, err := ssh.Dial("tcp", net.JoinHostPort(host, sshPort), config)
	if err != nil {
		return processes
	}
	defer conn.Close()

	// 获取进程信息
	if remoteProcesses, err := getRemoteProcessInfo(conn, host); err == nil {
		processes = remoteProcesses
	}

	return processes
}

// 如果是本地主机，直接使用gopsutil
func GetLocalSystemInfo() models.SystemInfo {
	systemInfo := models.SystemInfo{
		IP:          "localhost",
		Status:      "online",
		LastUpdated: time.Now(),
	}

	// CPU使用率
	if cpuPercents, err := cpu.Percent(time.Second, false); err == nil && len(cpuPercents) > 0 {
		systemInfo.CPUUsage = cpuPercents[0]
	}

	// 内存使用率
	if memStat, err := mem.VirtualMemory(); err == nil {
		systemInfo.MemoryUsage = memStat.UsedPercent
	}

	// 磁盘使用率
	if diskStat, err := disk.Usage("/"); err == nil {
		systemInfo.DiskUsage = diskStat.UsedPercent
	}

	// 网络信息
	if netStats, err := gopsutilNet.IOCounters(false); err == nil && len(netStats) > 0 {
		systemInfo.NetworkTx = formatBytes(int64(netStats[0].BytesSent))
		systemInfo.NetworkRx = formatBytes(int64(netStats[0].BytesRecv))
	}

	// 开放端口
	if connections, err := gopsutilNet.Connections("tcp"); err == nil {
		portMap := make(map[string]bool)
		for _, conn := range connections {
			if conn.Status == "LISTEN" {
				portMap[fmt.Sprintf("%d", conn.Laddr.Port)] = true
			}
		}
		for port := range portMap {
			systemInfo.Ports = append(systemInfo.Ports, port)
		}
	}

	return systemInfo
}

// 获取本地进程信息
func GetLocalProcessInfo() []models.ProcessInfo {
	var processes []models.ProcessInfo

	pids, err := process.Pids()
	if err != nil {
		return processes
	}

	for _, pid := range pids {
		if len(processes) >= 20 { // 限制返回前20个进程
			break
		}

		p, err := process.NewProcess(pid)
		if err != nil {
			continue
		}

		name, _ := p.Name()
		cpuPercent, _ := p.CPUPercent()
		memPercent, _ := p.MemoryPercent()
		cmdline, _ := p.Cmdline()

		// 获取进程端口
		var port string
		if connections, err := p.Connections(); err == nil && len(connections) > 0 {
			port = fmt.Sprintf("%d", connections[0].Laddr.Port)
		}

		processInfo := models.ProcessInfo{
			PID:         int(pid),
			Name:        name,
			CPUUsage:    cpuPercent,
			MemoryUsage: float64(memPercent),
			Port:        port,
			Command:     cmdline,
			Host:        "localhost",
		}

		processes = append(processes, processInfo)
	}

	return processes
}

// 远程执行gopsutil相关命令的辅助函数
func getRemoteCPUPercent(conn *ssh.Client) (float64, error) {
	session, err := conn.NewSession()
	if err != nil {
		return 0, err
	}
	defer session.Close()

	// 使用top命令获取CPU使用率
	output, err := session.CombinedOutput("top -bn1 | grep 'Cpu(s)' | sed 's/.*, *\\([0-9.]*\\)%* id.*/\\1/' | awk '{print 100 - $1}'")
	if err != nil {
		return 0, err
	}

	cpuStr := strings.TrimSpace(string(output))
	return strconv.ParseFloat(cpuStr, 64)
}

func getRemoteMemoryPercent(conn *ssh.Client) (float64, error) {
	session, err := conn.NewSession()
	if err != nil {
		return 0, err
	}
	defer session.Close()

	output, err := session.CombinedOutput("free | grep Mem | awk '{printf \"%.1f\", $3/$2 * 100.0}'")
	if err != nil {
		return 0, err
	}

	memStr := strings.TrimSpace(string(output))
	return strconv.ParseFloat(memStr, 64)
}

func getRemoteDiskPercent(conn *ssh.Client) (float64, error) {
	session, err := conn.NewSession()
	if err != nil {
		return 0, err
	}
	defer session.Close()

	output, err := session.CombinedOutput("df -h / | awk 'NR==2{print $5}' | sed 's/%//'")
	if err != nil {
		return 0, err
	}

	diskStr := strings.TrimSpace(string(output))
	return strconv.ParseFloat(diskStr, 64)
}

func getRemoteNetworkInfo(conn *ssh.Client) (string, string, error) {
	session, err := conn.NewSession()
	if err != nil {
		return "", "", err
	}
	defer session.Close()

	output, err := session.CombinedOutput("cat /proc/net/dev | grep -E '(eth0|ens|enp)' | head -1 | awk '{print $10 \",\" $2}'")
	if err != nil {
		return "", "", err
	}

	networkStr := strings.TrimSpace(string(output))
	parts := strings.Split(networkStr, ",")
	if len(parts) == 2 {
		tx := formatBytesFromString(strings.TrimSpace(parts[0]))
		rx := formatBytesFromString(strings.TrimSpace(parts[1]))
		return tx, rx, nil
	}

	return "0 B/s", "0 B/s", nil
}

func getRemoteOpenPorts(conn *ssh.Client) ([]string, error) {
	session, err := conn.NewSession()
	if err != nil {
		return nil, err
	}
	defer session.Close()

	output, err := session.CombinedOutput("netstat -tuln | grep LISTEN | awk '{print $4}' | cut -d: -f2 | sort -n | uniq | head -10")
	if err != nil {
		return nil, err
	}

	portsStr := strings.TrimSpace(string(output))
	if portsStr == "" {
		return []string{}, nil
	}

	return strings.Split(portsStr, "\n"), nil
}

func getRemoteProcessInfo(conn *ssh.Client, host string) ([]models.ProcessInfo, error) {
	session, err := conn.NewSession()
	if err != nil {
		return nil, err
	}
	defer session.Close()

	script := `ps aux --sort=-%cpu | head -21 | tail -n +2 | while read line; do
    PID=$(echo $line | awk '{print $2}')
    NAME=$(echo $line | awk '{print $11}' | cut -d'/' -f1)
    CPU=$(echo $line | awk '{print $3}')
    MEM=$(echo $line | awk '{print $4}')
    CMD=$(echo $line | awk '{for(i=11;i<=NF;i++) printf "%s ", $i; print ""}')
    PORT=$(netstat -tulnp 2>/dev/null | grep $PID | head -1 | awk '{print $4}' | cut -d: -f2)
    echo "$PID|$NAME|$CPU|$MEM|$PORT|$CMD"
done`

	output, err := session.CombinedOutput(script)
	if err != nil {
		return nil, err
	}

	var processes []models.ProcessInfo
	lines := strings.Split(strings.TrimSpace(string(output)), "\n")
	for _, line := range lines {
		if line == "" {
			continue
		}
		parts := strings.Split(line, "|")
		if len(parts) >= 6 {
			pid, _ := strconv.Atoi(parts[0])
			cpu, _ := strconv.ParseFloat(parts[2], 64)
			mem, _ := strconv.ParseFloat(parts[3], 64)

			process := models.ProcessInfo{
				PID:         pid,
				Name:        parts[1],
				CPUUsage:    cpu,
				MemoryUsage: mem,
				Port:        parts[4],
				Command:     parts[5],
				Host:        host,
			}
			processes = append(processes, process)
		}
	}

	return processes, nil
}

// 格式化字节数
func formatBytes(bytes int64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B/s", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB/s", float64(bytes)/float64(div), "KMGTPE"[exp])
}

func formatBytesFromString(bytesStr string) string {
	bytes, err := strconv.ParseInt(bytesStr, 10, 64)
	if err != nil {
		return "0 B/s"
	}
	return formatBytes(bytes)
}

// 在文件末尾添加获取操作系统信息的函数
func GetRemoteOSInfo(conn *ssh.Client) (string, error) {
	session, err := conn.NewSession()
	if err != nil {
		return "", err
	}
	defer session.Close()

	// 尝试多种方法获取操作系统信息
	commands := []string{
		"cat /etc/os-release | grep PRETTY_NAME | cut -d'=' -f2 | tr -d '\"'",
		"lsb_release -d 2>/dev/null | cut -f2",
		"cat /etc/redhat-release 2>/dev/null",
		"cat /etc/debian_version 2>/dev/null | sed 's/^/Debian /'",
		"uname -s",
	}

	for _, cmd := range commands {
		output, err := session.CombinedOutput(cmd)
		if err == nil && len(strings.TrimSpace(string(output))) > 0 {
			return strings.TrimSpace(string(output)), nil
		}
		// 重新创建session用于下一个命令
		session, _ = conn.NewSession()
	}

	return "Unknown", nil
}

// 获取主机操作系统信息的独立函数
func GetHostOSInfo(host, username, password string, port int) string {
	sshPort := "22"
	if port != 0 {
		sshPort = strconv.Itoa(port)
	}

	config := &ssh.ClientConfig{
		User: username,
		Auth: []ssh.AuthMethod{
			ssh.Password(password),
		},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         10 * time.Second,
	}

	conn, err := ssh.Dial("tcp", net.JoinHostPort(host, sshPort), config)
	if err != nil {
		return "Unknown"
	}
	defer conn.Close()

	osInfo, err := GetRemoteOSInfo(conn)
	if err != nil {
		return "Unknown"
	}

	return osInfo
}
