#!/bin/bash

# RunMe 项目启动脚本
echo "🚀 启动 RunMe 项目..."

# 定义端口
FRONTEND_PORT=3000
BACKEND_PORT=8080

# 函数：杀死指定端口的进程
kill_port() {
    local port=$1
    local pids=$(lsof -ti:$port)
    if [ ! -z "$pids" ]; then
        echo "🔪 杀死端口 $port 上的进程: $pids"
        kill -9 $pids
        sleep 1
    else
        echo "✅ 端口 $port 没有进程运行"
    fi
}

# 杀死可能占用端口的进程
echo "📋 检查并清理端口..."
kill_port $FRONTEND_PORT
kill_port $BACKEND_PORT

# 启动后端
echo "🔧 启动后端服务 (端口 $BACKEND_PORT)..."
cd backend
go run main.go &
BACKEND_PID=$!
cd ..

# 等待后端启动
echo "⏳ 等待后端服务启动..."
sleep 3

# 启动前端
echo "🎨 启动前端服务 (端口 $FRONTEND_PORT)..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

# 显示进程信息
echo "✅ 启动完成！"
echo "📊 后端进程 PID: $BACKEND_PID"
echo "📊 前端进程 PID: $FRONTEND_PID"
echo ""
echo "🌐 访问地址:"
echo "   前端: http://localhost:$FRONTEND_PORT"
echo "   后端: http://localhost:$BACKEND_PORT"
echo ""
echo "⚠️  按 Ctrl+C 停止所有服务"

# 捕获 Ctrl+C 信号
trap 'echo ""; echo "🛑 正在停止所有服务..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo "✅ 所有服务已停止"; exit 0' INT

# 等待进程结束
wait