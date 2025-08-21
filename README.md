# RunMe 👻

> 现代化的远程脚本执行和管理平台

RunMe 是一个功能强大的远程服务器管理平台，支持 Shell 脚本、Ansible Playbook、Docker 容器等多种自动化任务的统一管理和执行。

## ✨ 功能特性

- 🖥️ **主机组管理** - 分组管理多台服务器，支持SSH连接
- 📝 **Shell脚本执行** - 在线编写和批量执行Shell脚本  
- 🤖 **Ansible集成** - 可视化管理和执行Ansible Playbook
- 🐳 **Docker模板** - 预设Docker部署命令模板
- 📊 **实时监控** - 服务器CPU、内存、磁盘状态监控
- 🚀 **Git部署** - 从Git仓库自动化部署项目
- 💻 **Web终端** - 浏览器内直接SSH连接服务器
- 🔐 **用户权限** - 完整的用户角色和权限管理系统

## 🚀 快速开始

### 一键部署（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/xingkongyj2/runme.git
cd runme

# 2. 运行部署脚本
chmod +x deploy.sh
./deploy.sh
```

部署完成后访问：http://localhost:20002
- **默认账号**：`Admin`
- **默认密码**：`123456`

### 手动部署

```bash
# 1. 克隆项目
git clone https://github.com/xingkongyj2/runme.git
cd runme

# 2. 构建镜像
docker build -t runme .

# 3. 运行容器（带数据持久化）
docker run -d \
  --name runme-app \
  -p 20002:20002 \
  -v runme_data:/app/data \
  --restart unless-stopped \
  runme
```

## 🏗️ 技术架构

### 核心技术栈
- **前端**：React 18 + Tailwind CSS + Lucide Icons
- **后端**：Go + Gin Framework + SQLite
- **部署**：Docker 单进程架构
- **数据库**：SQLite（支持数据持久化）

### 架构特点
- ✅ **单进程架构** - Go后端同时服务API和静态文件
- ✅ **零配置部署** - 无需nginx或进程管理器
- ✅ **单端口服务** - 端口20002提供完整功能
- ✅ **SPA路由支持** - 完整的前端路由支持
- ✅ **安全设计** - 非root用户运行
- ✅ **数据持久化** - Docker卷支持数据永久保存

## 📖 使用指南

### 开发环境

```bash
# 启动开发环境（前后端分离）
./start.sh
```

### 数据管理

```bash
# 备份数据库
docker cp runme-app:/app/data/runme.db ./backup.db

# 查看数据卷信息
docker volume inspect runme_data

# 查看容器日志
docker logs runme-app
```

### 常用命令

```bash
# 查看运行状态
docker ps | grep runme

# 重启服务
docker restart runme-app

# 停止服务
docker stop runme-app

# 更新部署
./deploy.sh
```

## 📸 功能展示

- **主机管理** - 分组管理服务器，实时连接状态
- **脚本执行** - 可视化脚本编辑器，批量执行结果
- **监控面板** - 服务器资源使用情况图表
- **Web终端** - 浏览器内完整的SSH终端体验
- **部署管理** - Git仓库一键部署到目标服务器

## 🤝 贡献指南

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🆘 支持

如遇问题或有建议，请：
- 提交 [Issue](../../issues)
- 查看 [Wiki](../../wiki) 文档
- 联系项目维护者

---

⭐ 如果这个项目对你有帮助，请给个Star支持一下！