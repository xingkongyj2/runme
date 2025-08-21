# Docker 部署说明

## 构建和运行

### 构建镜像
```bash
docker build -t runme .
```

### 运行容器
```bash
docker run -d \
  --name runme-app \
  -p 20002:20002 \
  runme
```

### 访问应用
- 前端界面: http://localhost:20002
- API接口: http://localhost:20002/api

## 架构说明

新的Docker配置采用**单进程架构**：
- ✅ Go后端同时处理API请求和前端静态文件服务
- ✅ 无需nginx或进程管理器
- ✅ 单个端口(20002)提供完整服务
- ✅ 支持前端SPA路由
- ✅ 非root用户运行，更安全

## 与旧版本的区别

### 旧版本 (使用supervisord)
- 使用nginx + Go后端 + supervisord
- 需要管理多个进程
- 配置复杂
- 多个端口

### 新版本 (简化架构)  
- 仅Go后端单进程
- 自动处理前后端路由
- 配置简单
- 单个端口

## 开发环境 vs 生产环境

- **开发环境**: 使用 `./start.sh` 分别启动前后端
- **生产环境**: 使用 Docker 单进程部署