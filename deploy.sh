#!/bin/bash

# RunMe 项目一键部署脚本
# 使用方法: 
# 1. git clone https://github.com/xingkongyj2/runme.git
# 2. cd runme
# 3. ./deploy.sh

set -e  # 遇到错误立即退出

echo "🚀 开始部署 RunMe 项目..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目配置
PROJECT_NAME="runme"
CONTAINER_NAME="runme-app"
PORT="20002"
VOLUME_NAME="runme_data"

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装，请先安装 Docker${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker 已安装${NC}"

# 停止并删除现有容器（如果存在）
if docker ps -a --format 'table {{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${YELLOW}🔄 停止现有容器...${NC}"
    docker stop ${CONTAINER_NAME} || true
    echo -e "${YELLOW}🗑️  删除现有容器...${NC}"
    docker rm ${CONTAINER_NAME} || true
fi

# 删除现有镜像（可选，确保使用最新代码）
if docker images --format 'table {{.Repository}}' | grep -q "^${PROJECT_NAME}$"; then
    echo -e "${YELLOW}🗑️  删除旧镜像...${NC}"
    docker rmi ${PROJECT_NAME} || true
fi

# 注释：不再使用Docker volume，直接映射到本地目录

# 构建Docker镜像
echo -e "${BLUE}🏗️  构建 Docker 镜像...${NC}"
docker build -t ${PROJECT_NAME} .

# 获取脚本所在目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="${SCRIPT_DIR}/runme-data"

# 创建本地数据目录并设置权限
mkdir -p "${DATA_DIR}"
chmod 755 "${DATA_DIR}"
echo -e "${GREEN}✅ 创建本地数据目录: ${DATA_DIR}${NC}"

# 运行容器
echo -e "${BLUE}🚢 启动容器...${NC}"
docker run -d \
  --name ${CONTAINER_NAME} \
  -p ${PORT}:${PORT} \
  -v "${DATA_DIR}":/app/data \
  --user root \
  --restart unless-stopped \
  ${PROJECT_NAME}

# 等待容器启动
echo -e "${YELLOW}⏳ 等待服务启动...${NC}"
sleep 5

# 检查容器状态
if docker ps --format 'table {{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${GREEN}✅ 容器启动成功！${NC}"
    
    # 显示容器日志（最后10行）
    echo -e "${BLUE}📋 容器启动日志:${NC}"
    docker logs --tail 10 ${CONTAINER_NAME}
    
    echo ""
    echo -e "${GREEN}🎉 部署完成！${NC}"
    echo -e "${BLUE}📱 前端访问地址: ${NC}http://localhost:${PORT}"
    echo -e "${BLUE}🔌 API接口地址: ${NC}http://localhost:${PORT}/api"
    echo -e "${BLUE}👤 默认管理员账号: ${NC}Admin"
    echo -e "${BLUE}🔑 默认管理员密码: ${NC}123456"
    echo ""
    echo -e "${YELLOW}💡 实用命令:${NC}"
    echo -e "  查看容器状态: ${BLUE}docker ps${NC}"
    echo -e "  查看容器日志: ${BLUE}docker logs ${CONTAINER_NAME}${NC}"
    echo -e "  停止容器: ${BLUE}docker stop ${CONTAINER_NAME}${NC}"
    echo -e "  重启容器: ${BLUE}docker restart ${CONTAINER_NAME}${NC}"
    echo -e "  查看数据目录: ${BLUE}ls -la ${DATA_DIR}${NC}"
    echo -e "  数据库路径: ${BLUE}${DATA_DIR}/runme.db${NC}"
    
else
    echo -e "${RED}❌ 容器启动失败！${NC}"
    echo -e "${YELLOW}📋 容器日志:${NC}"
    docker logs ${CONTAINER_NAME}
    exit 1
fi