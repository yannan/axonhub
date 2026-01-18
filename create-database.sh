#!/bin/bash

# 创建 AxonHub 数据库脚本
# 
# 使用方法：
#   ./create-database.sh

MARIADB_HOST="localhost"
MARIADB_PORT="3306"
MARIADB_USER="anyshare"
MARIADB_PASSWORD="eisoo.com123"
MARIADB_DATABASE="axonhub"

echo "============================================"
echo "创建 AxonHub 数据库"
echo "============================================"
echo "主机: ${MARIADB_HOST}"
echo "端口: ${MARIADB_PORT}"
echo "用户: ${MARIADB_USER}"
echo "数据库: ${MARIADB_DATABASE}"
echo "============================================"
echo ""

# 检查是否有 mysql 客户端
if command -v mysql &> /dev/null; then
    echo "使用 mysql 客户端创建数据库..."
    mysql -h "${MARIADB_HOST}" -P "${MARIADB_PORT}" -u "${MARIADB_USER}" -p"${MARIADB_PASSWORD}" <<EOF
CREATE DATABASE IF NOT EXISTS ${MARIADB_DATABASE} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SHOW DATABASES LIKE '${MARIADB_DATABASE}';
EOF
    if [ $? -eq 0 ]; then
        echo "✓ 数据库创建成功！"
    else
        echo "✗ 数据库创建失败，请检查连接信息"
        exit 1
    fi
elif command -v docker &> /dev/null; then
    echo "尝试通过 Docker 容器创建数据库..."
    # 查找 MariaDB 容器
    MARIADB_CONTAINER=$(docker ps --filter "publish=3330" --format "{{.Names}}" | head -1)
    if [ -n "$MARIADB_CONTAINER" ]; then
        echo "找到 MariaDB 容器: $MARIADB_CONTAINER"
        docker exec -i "$MARIADB_CONTAINER" mysql -u "${MARIADB_USER}" -p"${MARIADB_PASSWORD}" <<EOF
CREATE DATABASE IF NOT EXISTS ${MARIADB_DATABASE} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SHOW DATABASES LIKE '${MARIADB_DATABASE}';
EOF
        if [ $? -eq 0 ]; then
            echo "✓ 数据库创建成功！"
        else
            echo "✗ 数据库创建失败"
            exit 1
        fi
    else
        echo "未找到运行在端口 3330 的 MariaDB 容器"
        echo "请手动执行以下 SQL 语句："
        echo ""
        echo "CREATE DATABASE IF NOT EXISTS ${MARIADB_DATABASE} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
        echo ""
        exit 1
    fi
else
    echo "未找到 mysql 客户端或 docker 命令"
    echo "请手动执行以下 SQL 语句："
    echo ""
    echo "CREATE DATABASE IF NOT EXISTS ${MARIADB_DATABASE} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    echo ""
    exit 1
fi

echo ""
echo "数据库创建完成！现在可以启动 AxonHub 了："
echo "  ./start-with-external-mariadb.sh"
echo ""

