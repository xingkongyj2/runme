# 前端构建阶段
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/ .
RUN npm run build

# 后端构建阶段 - 使用Debian基础镜像避免Alpine兼容性问题
FROM golang:1.21-bullseye AS backend-builder

# 安装SQLite开发库
RUN apt-get update && apt-get install -y sqlite3 libsqlite3-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ .
RUN CGO_ENABLED=1 go build -o main .

# 最终运行阶段 - 使用Debian slim保持兼容性
FROM debian:bullseye-slim

# 安装必要的工具和SQLite运行时依赖
RUN apt-get update && \
    apt-get install -y ca-certificates tzdata sqlite3 && \
    rm -rf /var/lib/apt/lists/*

# 设置时区为中国标准时间
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 创建应用目录
RUN mkdir -p /app/frontend /app/backend /app/data

# 设置工作目录
WORKDIR /app

# 复制后端可执行文件
COPY --from=backend-builder /app/backend/main ./backend/

# 复制前端构建文件
COPY --from=frontend-builder /app/frontend/build ./frontend/

# 设置执行权限
RUN chmod +x /app/backend/main

# 创建非root用户
RUN adduser -D -s /bin/sh appuser
RUN chown -R appuser:appuser /app
USER appuser

# 暴露后端端口
EXPOSE 20002

# 声明数据卷用于数据库持久化
VOLUME ["/app/data"]

# 启动后端服务（后端将同时服务前端文件）
CMD ["/app/backend/main"]