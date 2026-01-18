# 使用 MariaDB 启动 AxonHub

## 🚀 快速开始

### 方式一：使用 Docker Compose（推荐）

这是最简单的方式，一键启动 MariaDB 和 AxonHub：

```bash
# 1. 进入项目目录
cd /Users/yannan/docker-apps/axon/axonhub

# 2. 启动 MariaDB 和 AxonHub 服务
docker-compose up -d mariadb axonhub-mariadb

# 3. 查看服务状态
docker-compose ps

# 4. 查看日志
docker-compose logs -f axonhub-mariadb
```

服务启动后：
- **MariaDB**: 运行在 `localhost:3306`
- **AxonHub**: 运行在 `http://localhost:8090`
- **前端管理界面**: 访问 `http://localhost:8090`（如果前端已构建）

### 方式二：本地开发（使用 Docker MariaDB + 本地后端）

如果你需要在本地开发后端代码：

```bash
# 1. 启动 MariaDB 容器
docker-compose up -d mariadb

# 2. 设置环境变量
export AXONHUB_DB_DIALECT=mysql
export AXONHUB_DB_DSN="axonhub:axonhub_password@tcp(localhost:3306)/axonhub?charset=utf8mb4&parseTime=True&loc=Local"

# 3. 启动后端（使用 Air 热重载）
go install github.com/air-verse/air@latest
air

# 4. 在新终端启动前端
cd frontend
pnpm install
pnpm dev
```

### 方式三：使用本地 MariaDB 实例

如果你已经安装了 MariaDB：

```bash
# 1. 创建数据库
mysql -u root -p
CREATE DATABASE axonhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'axonhub'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON axonhub.* TO 'axonhub'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# 2. 设置环境变量
export AXONHUB_DB_DIALECT=mysql
export AXONHUB_DB_DSN="axonhub:your_password@tcp(localhost:3306)/axonhub?charset=utf8mb4&parseTime=True&loc=Local"

# 3. 启动服务
air  # 后端
cd frontend && pnpm dev  # 前端
```

## 📋 配置说明

### Docker Compose 配置

在 `docker-compose.yml` 中，MariaDB 配置如下：

```yaml
mariadb:
  image: mariadb:11.3
  container_name: axonhub-mariadb
  environment:
    MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-axonhub_root_password}
    MYSQL_DATABASE: axonhub
    MYSQL_USER: axonhub
    MYSQL_PASSWORD: ${MYSQL_PASSWORD:-axonhub_password}
  ports:
    - "3306:3306"
```

### 环境变量

可以通过环境变量自定义配置：

```bash
# 设置数据库密码
export MYSQL_ROOT_PASSWORD=your_secure_password
export MYSQL_PASSWORD=your_secure_password

# 然后启动服务
docker-compose up -d mariadb axonhub-mariadb
```

### 配置文件方式

也可以创建 `config.yml` 文件：

```yaml
db:
  dialect: mysql
  dsn: "axonhub:axonhub_password@tcp(localhost:3306)/axonhub?charset=utf8mb4&parseTime=True&loc=Local"
```

## 🔍 验证连接

### 检查 MariaDB 容器状态

```bash
# 查看容器状态
docker-compose ps mariadb

# 查看 MariaDB 日志
docker-compose logs mariadb

# 进入 MariaDB 容器
docker-compose exec mariadb bash

# 连接数据库
docker-compose exec mariadb mysql -u axonhub -paxonhub_password axonhub
```

### 检查 AxonHub 连接

```bash
# 查看 AxonHub 日志
docker-compose logs axonhub-mariadb

# 检查健康状态
curl http://localhost:8090/health
```

## 🛠️ 常用操作

### 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止并删除数据卷（⚠️ 会删除所有数据）
docker-compose down -v
```

### 重启服务

```bash
# 重启服务
docker-compose restart axonhub-mariadb

# 重启 MariaDB
docker-compose restart mariadb
```

### 备份数据库

```bash
# 备份数据库
docker-compose exec mariadb mysqldump -u axonhub -paxonhub_password axonhub > backup.sql

# 恢复数据库
docker-compose exec -T mariadb mysql -u axonhub -paxonhub_password axonhub < backup.sql
```

### 查看数据库

```bash
# 使用命令行
docker-compose exec mariadb mysql -u axonhub -paxonhub_password axonhub

# 或使用 GUI 工具连接
# Host: localhost
# Port: 3306
# User: axonhub
# Password: axonhub_password
# Database: axonhub
```

## ⚠️ 注意事项

1. **MariaDB 与 MySQL 兼容性**
   - MariaDB 与 MySQL 完全兼容
   - 在配置中使用 `dialect: mysql`（不是 `mariadb`）
   - DSN 格式与 MySQL 完全相同

2. **端口冲突**
   - 默认端口是 3306
   - 如果端口被占用，可以在 `docker-compose.yml` 中修改端口映射：
     ```yaml
     ports:
       - "3307:3306"  # 将主机端口改为 3307
     ```
   - 然后更新 DSN：`...@tcp(localhost:3307)/...`

3. **数据持久化**
   - 数据存储在 Docker volume `mariadb_data` 中
   - 即使删除容器，数据也会保留
   - 要完全删除数据：`docker-compose down -v`

4. **字符集**
   - 确保使用 `utf8mb4` 字符集以支持完整的 Unicode（包括 emoji）
   - DSN 中已包含 `charset=utf8mb4`

## 🐛 故障排查

### 问题：无法连接到数据库

```bash
# 检查容器是否运行
docker-compose ps

# 查看 MariaDB 日志
docker-compose logs mariadb

# 检查网络连接
docker-compose exec mariadb mysqladmin ping -h localhost -u root -paxonhub_root_password
```

### 问题：权限错误

```bash
# 进入容器并检查用户权限
docker-compose exec mariadb mysql -u root -paxonhub_root_password
GRANT ALL PRIVILEGES ON axonhub.* TO 'axonhub'@'%';
FLUSH PRIVILEGES;
```

### 问题：数据库迁移失败

```bash
# 查看 AxonHub 日志
docker-compose logs axonhub-mariadb

# 手动检查数据库结构
docker-compose exec mariadb mysql -u axonhub -paxonhub_password axonhub -e "SHOW TABLES;"
```

## 📚 相关文档

- [本地开发指南](LOCAL_DEVELOPMENT.md)
- [配置文档](docs/en/deployment/configuration.md)
- [Docker 部署文档](docs/en/deployment/docker.md)

