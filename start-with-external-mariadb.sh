#!/bin/bash

# AxonHub 启动脚本 - 使用外部 MariaDB
# 
# 使用方法：
#   1. 修改下面的环境变量，填入你的 MariaDB 连接信息
#   2. 运行: ./start-with-external-mariadb.sh

# ============================================
# MariaDB 连接配置 - 请修改以下信息
# ============================================

# MariaDB 主机地址
# - 如果 MariaDB 在主机上: host.docker.internal
# - 如果 MariaDB 在 Docker 网络中: 容器名称或服务名称
# - 如果 MariaDB 在远程服务器: IP 地址或域名
MARIADB_HOST="localhost"

# MariaDB 端口
MARIADB_PORT="3306"

# 数据库名称
MARIADB_DATABASE="axonhub"

# 数据库用户名
MARIADB_USER="anyshare"

# 数据库密码
MARIADB_PASSWORD="eisoo.com123"

# ============================================
# 构建 DSN
# ============================================

DSN="${MARIADB_USER}:${MARIADB_PASSWORD}@tcp(${MARIADB_HOST}:${MARIADB_PORT})/${MARIADB_DATABASE}?charset=utf8mb4&parseTime=True&loc=Local"

echo "============================================"
echo "AxonHub 启动配置"
echo "============================================"
echo "MariaDB 主机: ${MARIADB_HOST}"
echo "MariaDB 端口: ${MARIADB_PORT}"
echo "数据库名称: ${MARIADB_DATABASE}"
echo "数据库用户: ${MARIADB_USER}"
echo "DSN: ${MARIADB_USER}:***@tcp(${MARIADB_HOST}:${MARIADB_PORT})/${MARIADB_DATABASE}?charset=utf8mb4&parseTime=True&loc=Local"
echo "============================================"
echo ""

# 导出环境变量
export AXONHUB_DB_DIALECT=mysql
export AXONHUB_DB_DSN="${DSN}"

# 启动服务
echo "正在启动 AxonHub..."
docker compose up -d axonhub

# 等待服务启动
echo "等待服务启动..."
sleep 5

# 检查服务状态
echo ""
echo "服务状态:"
docker compose ps axonhub

echo ""
echo "查看日志:"
echo "  docker compose logs -f axonhub"
echo ""
echo "访问地址:"
echo "  http://localhost:8090"
echo ""

