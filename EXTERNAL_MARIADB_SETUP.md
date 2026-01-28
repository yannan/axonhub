# 使用外部 MariaDB 启动 AxonHub

## 📋 配置步骤

### 1. 准备 MariaDB 连接信息

请准备以下信息：
- **主机地址**: MariaDB 所在的主机（如 `localhost`、`192.168.1.100` 或容器名称）
- **端口**: MariaDB 端口（默认 `3306`）
- **数据库名**: 数据库名称（如 `axonhub`）
- **用户名**: 数据库用户名
- **密码**: 数据库密码

### 2. 创建数据库（如果还没有）

```sql
CREATE DATABASE axonhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'axonhub'@'%' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON axonhub.* TO 'axonhub'@'%';
FLUSH PRIVILEGES;
```

### 3. 启动 AxonHub

#### 方式一：使用环境变量（推荐）

```bash
# 设置 MariaDB 连接信息
export MARIADB_HOST="host.docker.internal"  # 或你的 MariaDB 主机地址
export MARIADB_PORT="3306"                    # 或你的 MariaDB 端口
export MARIADB_DATABASE="axonhub"            # 数据库名
export MARIADB_USER="axonhub"                # 用户名
export MARIADB_PASSWORD="your_password"      # 密码

# 构建 DSN
export AXONHUB_DB_DIALECT=mysql
export AXONHUB_DB_DSN="${MARIADB_USER}:${MARIADB_PASSWORD}@tcp(${MARIADB_HOST}:${MARIADB_PORT})/${MARIADB_DATABASE}?charset=utf8mb4&parseTime=True&loc=Local"

# 启动服务
cd /Users/yannan/docker-apps/axon/axonhub
docker compose up -d axonhub
```

#### 方式二：使用启动脚本

```bash
# 编辑脚本，修改 MariaDB 连接信息
vim start-with-external-mariadb.sh

# 或直接设置环境变量后运行
export MARIADB_HOST="host.docker.internal"
export MARIADB_PASSWORD="your_password"
./start-with-external-mariadb.sh
```

#### 方式三：直接修改 docker-compose.yml

编辑 `docker-compose.yml`，修改第 120 行的 DSN：

```yaml
AXONHUB_DB_DSN: "your_user:your_password@tcp(your_host:3306)/axonhub?charset=utf8mb4&parseTime=True&loc=Local"
```

然后运行：
```bash
docker compose up -d axonhub
```

## 🔍 不同场景的配置

### 场景 1: MariaDB 在主机上运行

```bash
export AXONHUB_DB_DSN="axonhub:password@tcp(host.docker.internal:3306)/axonhub?charset=utf8mb4&parseTime=True&loc=Local"
```

### 场景 2: MariaDB 在 Docker 网络中

如果 MariaDB 容器也在同一个 docker-compose 网络中：

```bash
export AXONHUB_DB_DSN="axonhub:password@tcp(mariadb_container_name:3306)/axonhub?charset=utf8mb4&parseTime=True&loc=Local"
```

### 场景 3: MariaDB 在远程服务器

```bash
export AXONHUB_DB_DSN="axonhub:password@tcp(192.168.1.100:3306)/axonhub?charset=utf8mb4&parseTime=True&loc=Local"
```

### 场景 4: MariaDB 使用非标准端口

```bash
export AXONHUB_DB_DSN="axonhub:password@tcp(host.docker.internal:3330)/axonhub?charset=utf8mb4&parseTime=True&loc=Local"
```

## ✅ 验证连接

启动后检查服务状态：

```bash
# 查看服务状态
docker compose ps axonhub

# 查看日志
docker compose logs -f axonhub

# 检查健康状态
curl http://localhost:8090/health
```

## 🐛 故障排查

### 问题：无法连接到数据库

1. **检查 MariaDB 是否运行**
   ```bash
   # 如果 MariaDB 在主机上
   mysql -h localhost -u axonhub -p axonhub
   
   # 如果 MariaDB 在 Docker 中
   docker ps | grep mariadb
   ```

2. **检查网络连接**
   - 如果 MariaDB 在主机上，确保使用 `host.docker.internal`
   - 如果 MariaDB 在 Docker 网络中，确保容器在同一网络

3. **检查防火墙**
   - 确保 MariaDB 端口（默认 3306）没有被防火墙阻止

4. **检查用户权限**
   ```sql
   SHOW GRANTS FOR 'axonhub'@'%';
   ```

### 问题：权限错误

```sql
-- 授予所有权限
GRANT ALL PRIVILEGES ON axonhub.* TO 'axonhub'@'%';
FLUSH PRIVILEGES;
```

### 问题：字符集错误

确保数据库使用 utf8mb4：

```sql
ALTER DATABASE axonhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 📝 示例

### 完整启动示例

```bash
# 1. 设置连接信息
export MARIADB_HOST="host.docker.internal"
export MARIADB_PORT="3306"
export MARIADB_DATABASE="axonhub"
export MARIADB_USER="axonhub"
export MARIADB_PASSWORD="my_secure_password"

# 2. 构建 DSN
export AXONHUB_DB_DIALECT=mysql
export AXONHUB_DB_DSN="${MARIADB_USER}:${MARIADB_PASSWORD}@tcp(${MARIADB_HOST}:${MARIADB_PORT})/${MARIADB_DATABASE}?charset=utf8mb4&parseTime=True&loc=Local"

# 3. 启动服务
cd /Users/yannan/docker-apps/axon/axonhub
docker compose up -d axonhub

# 4. 查看日志
docker compose logs -f axonhub

# 5. 访问服务
open http://localhost:8090
```

## 🔗 相关文档

- [本地开发指南](LOCAL_DEVELOPMENT.md)
- [MariaDB 设置指南](MARIADB_SETUP.md)
- [配置文档](docs/en/deployment/configuration.md)

