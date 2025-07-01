package services

import (
	"encoding/json"
	"fmt"
	"runme-backend/database"
	"runme-backend/models"
	"strconv"
	"strings"
	"time"
)

// GetHostGroupByID 根据ID获取主机组
func GetHostGroupByID(id int) (*models.HostGroup, error) {
	var hostGroup models.HostGroup
	err := database.DB.QueryRow("SELECT id, name, username, password, port, hosts, created_at, updated_at FROM hostgroups WHERE id = ?", id).Scan(
		&hostGroup.ID, &hostGroup.Name, &hostGroup.Username, &hostGroup.Password, &hostGroup.Port, &hostGroup.Hosts, &hostGroup.CreatedAt, &hostGroup.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &hostGroup, nil
}

// GetHostSystemInfo 获取主机系统信息
func GetHostSystemInfo(host, username, password string, port int) models.SystemInfo {
	sshPort := "22"
	if port != 0 {
		sshPort = strconv.Itoa(port)
	}

	client := NewSSHClient(host+":"+sshPort, username, password)
	
	// 系统监控脚本
	script := `
#!/bin/bash
# CPU使用率
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')

# 内存使用率
MEM_USAGE=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')

# 磁盘使用率
DISK_USAGE=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//')

# 网络流量 (简化版)
NETWORK_TX=$(cat /proc/net/dev | grep eth0 | awk '{print $10}' || echo "0")
NETWORK_RX=$(cat /proc/net/dev | grep eth0 | awk '{print $2}' || echo "0")

# 开放端口
PORTS=$(netstat -tuln | grep LISTEN | awk '{print $4}' | cut -d: -f2 | sort -n | uniq | head -10 | tr '\n' ',')

# 输出JSON格式
echo "{"
echo "  \"cpu_usage\": $CPU_USAGE,"
echo "  \"memory_usage\": $MEM_USAGE,"
echo "  \"disk_usage\": $DISK_USAGE,"
echo "  \"network_tx\": \"$NETWORK_TX\","
echo "  \"network_rx\": \"$NETWORK_RX\","
echo "  \"ports\": \"$PORTS\""
echo "}"
`

	result := client.ExecuteScript(script)
	systemInfo := models.SystemInfo{
		IP:          host,
		Status:      "offline",
		LastUpdated: time.Now(),
	}

	if result.Status == "success" {
		systemInfo.Status = "online"
		
		// 解析JSON输出
		var data map[string]interface{}
		if err := json.Unmarshal([]byte(result.Output), &data); err == nil {
			if cpu, ok := data["cpu_usage"].(float64); ok {
				systemInfo.CPUUsage = cpu
			}
			if mem, ok := data["memory_usage"].(float64); ok {
				systemInfo.MemoryUsage = mem
			}
			if disk, ok := data["disk_usage"].(float64); ok {
				systemInfo.DiskUsage = disk
			}
			if tx, ok := data["network_tx"].(string); ok {
				systemInfo.NetworkTx = formatBytes(tx)
			}
			if rx, ok := data["network_rx"].(string); ok {
				systemInfo.NetworkRx = formatBytes(rx)
			}
			if ports, ok := data["ports"].(string); ok {
				if ports != "" {
					systemInfo.Ports = strings.Split(strings.TrimSuffix(ports, ","), ",")
				}
			}
		}
	}

	return systemInfo
}

// GetHostProcessInfo 获取主机进程信息
func GetHostProcessInfo(host, username, password string, port int) []models.ProcessInfo {
	sshPort := "22"
	if port != 0 {
		sshPort = strconv.Itoa(port)
	}

	client := NewSSHClient(host+":"+sshPort, username, password)
	
	// 进程监控脚本
	script := `
#!/bin/bash
ps aux --sort=-%cpu | head -20 | tail -n +2 | while read line; do
    PID=$(echo $line | awk '{print $2}')
    NAME=$(echo $line | awk '{print $11}' | cut -d'/' -f1)
    CPU=$(echo $line | awk '{print $3}')
    MEM=$(echo $line | awk '{print $4}')
    CMD=$(echo $line | awk '{for(i=11;i<=NF;i++) printf "%s ", $i; print ""}')
    
    # 获取进程端口
    PORT=$(netstat -tulnp 2>/dev/null | grep $PID | head -1 | awk '{print $4}' | cut -d: -f2)
    
    echo "$PID|$NAME|$CPU|$MEM|$PORT|$CMD"
done
`

	result := client.ExecuteScript(script)
	var processes []models.ProcessInfo

	if result.Status == "success" {
		lines := strings.Split(strings.TrimSpace(result.Output), "\n")
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
	}

	return processes
}

// formatBytes 格式化字节数
func formatBytes(bytesStr string) string {
	bytes, err := strconv.ParseInt(bytesStr, 10, 64)
	if err != nil {
		return "0 B"
	}
	
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB/s", float64(bytes)/float64(div), "KMGTPE"[exp])
}