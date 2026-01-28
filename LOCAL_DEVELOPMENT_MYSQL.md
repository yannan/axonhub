# 使用 MySQL 进行本地开发指南

## 📋 前置要求

- **Go 1.24+** - [下载地址](https://golang.org/dl/)
- **Node.js 18+** - [下载地址](https://nodejs.org/)
- **pnpm** - 包管理器 (`npm install -g pnpm`)
- **Docker** - 用于运行 MySQL 数据库
- **Git** - 版本控制

## 🚀 快速启动步骤

### 1. 启动 MySQL 数据库

```bash
# 在项目根目录下，启动 MySQL 服务
docker-compose up -d mysql

# 查看 MySQL 服务状态
docker-compose ps

# 查看 MySQL 日志（确认数据库已就绪）
docker-compose logs -f mysql
```

等待看到类似 `ready for connections` 的日志信息，表示 MySQL 已就绪。

### 2. 配置环境变量

在启动后端服务前，需要设置数据库连接环境变量：

```bash
# 设置数据库类型为 MySQL
export AXONHUB_DB_DIALECT=mysql

# 设置数据库连接字符串
# 格式: user:password@tcp(host:port)/database?charset=utf8mb4&parseTime=True&loc=Local
export AXONHUB_DB_DSN="axonhub:axonhub_password@tcp(localhost:3306)/axonhub?charset=utf8mb4&parseTime=True&loc=Local"
```

**默认 MySQL 配置：**
- 用户名: `axonhub`
- 密码: `axonhub_password`
- 数据库名: `axonhub`
- 端口: `3306`

如果需要修改密码，可以在启动 MySQL 前设置环境变量：
```bash
export MYSQL_PASSWORD=your_password
export MYSQL_ROOT_PASSWORD=your_root_password
```

### 3. 启动后端服务

#### 方式一：使用 Air 热重载（推荐）

```bash
# 安装 air（如果尚未安装）
go install github.com/air-verse/air@latest

# 设置环境变量（如果还没设置）
export AXONHUB_DB_DIALECT=mysql
export AXONHUB_DB_DSN="axonhub:axonhub_password@tcp(localhost:3306)/axonhub?charset=utf8mb4&parseTime=True&loc=Local"

# 启动后端（自动热重载）
air
```

#### 方式二：直接构建运行

```bash
# 设置环境变量
export AXONHUB_DB_DIALECT=mysql
export AXONHUB_DB_DSN="axonhub:axonhub_password@tcp(localhost:3306)/axonhub?charset=utf8mb4&parseTime=True&loc=Local"

# 构建后端
make build-backend

# 运行
./axonhub
```

后端服务将启动在 `http://localhost:8090`

数据库迁移会在服务启动时自动执行。

### 4. 启动前端开发服务器

在新的终端窗口中：

```bash
cd frontend

# 安装依赖（首次运行）
pnpm install

# 启动开发服务器
pnpm dev
```

前端开发服务器将启动在 `http://localhost:5173`

前端会自动代理以下路径到后端：
- `/admin` → `http://localhost:8090/admin`
- `/v1` → `http://localhost:8090/v1`

## 🔧 使用配置文件方式（可选）

你也可以创建 `config.yml` 文件来配置数据库：

```yaml
# config.yml
server:
  port: 8090
  debug: true

db:
  dialect: mysql
  dsn: "axonhub:axonhub_password@tcp(localhost:3306)/axonhub?charset=utf8mb4&parseTime=True&loc=Local"
  debug: false

log:
  level: debug
  encoding: console
```

然后启动后端时，确保配置文件在项目根目录。

## 🛠️ 常用命令

### 数据库管理

```bash
# 启动 MySQL
docker-compose up -d mysql

# 停止 MySQL
docker-compose stop mysql

# 重启 MySQL
docker-compose restart mysql

# 查看 MySQL 日志
docker-compose logs -f mysql

# 进入 MySQL 容器
docker exec -it axonhub-mysql mysql -u axonhub -paxonhub_password axonhub

# 删除 MySQL 数据（注意：会删除所有数据）
docker-compose down -v mysql
```

### 开发命令

```bash
# 代码生成（修改了 Ent schema 或 GraphQL schema 后）
make generate

# 构建完整项目
make build

# 运行测试
go test ./...
```

## 🐛 故障排除

### 1. 数据库连接失败

**问题**: 后端无法连接到 MySQL

**解决方案**:
- 确认 MySQL 容器正在运行: `docker-compose ps`
- 检查端口是否被占用: `lsof -i :3306`
- 验证连接字符串是否正确
- 查看 MySQL 日志: `docker-compose logs mysql`

### 2. 端口被占用

**问题**: 3306 端口已被占用

**解决方案**:
- 修改 `docker-compose.yml` 中的端口映射，例如改为 `3307:3306`
- 相应地更新 `AXONHUB_DB_DSN` 中的端口号

### 3. 数据库迁移失败

**问题**: 启动时数据库迁移失败

**解决方案**:
- 检查 MySQL 日志查看具体错误
- 确认数据库用户有足够的权限
- 尝试手动创建数据库: `docker exec -it axonhub-mysql mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS axonhub;"`

### 4. 权限问题

**问题**: 数据库用户权限不足

**解决方案**:
```bash
# 进入 MySQL 容器
docker exec -it axonhub-mysql mysql -u root -paxonhub_root_password

# 授予权限
GRANT ALL PRIVILEGES ON axonhub.* TO 'axonhub'@'%';
FLUSH PRIVILEGES;
```

## 📝 测试账号

前端测试时使用以下账号登录：
- **邮箱**: `my@example.com`
- **密码**: `pwd123456`

## 💡 提示

- MySQL 数据会持久化保存在 Docker volume `mysql_data` 中
- 使用 Air 进行后端热重载，提高开发效率
- 前端开发服务器已配置代理，无需手动处理 CORS
- 数据库迁移会在服务启动时自动执行
- 如果需要重置数据库，可以删除 volume: `docker-compose down -v`

## 🔄 完整启动流程示例

```bash
# 1. 启动 MySQL
docker-compose up -d mysql

# 2. 等待 MySQL 就绪（查看日志）
docker-compose logs -f mysql
# 看到 "ready for connections" 后按 Ctrl+C 退出日志查看

# 3. 设置环境变量并启动后端（终端1）
export AXONHUB_DB_DIALECT=mysql
export AXONHUB_DB_DSN="axonhub:axonhub_password@tcp(localhost:3306)/axonhub?charset=utf8mb4&parseTime=True&loc=Local"
air

# 4. 启动前端（终端2）
cd frontend
pnpm install  # 首次运行
pnpm dev
```

访问 `http://localhost:5173` 开始开发！

