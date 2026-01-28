# AxonHub 本地开发指南

## 📋 前置要求

在开始之前，请确保已安装以下工具：

- **Go 1.24+** - [下载地址](https://golang.org/dl/)
- **Node.js 18+** - [下载地址](https://nodejs.org/)
- **pnpm** - 包管理器
  ```bash
  npm install -g pnpm
  ```
- **Git** - 版本控制
- **Docker** (可选) - 用于运行 PostgreSQL/MySQL 数据库

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/looplj/axonhub.git
cd axonhub
```

### 2. 配置数据库

#### 方式一：使用 SQLite（推荐用于本地开发）

SQLite 是默认配置，无需额外设置。数据库文件会自动创建在项目根目录的 `axonhub.db`。

#### 方式二：使用 Docker Compose 启动 MariaDB（推荐）

```bash
# 启动 MariaDB 数据库和 AxonHub 服务
docker-compose up -d mariadb axonhub-mariadb

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f axonhub-mariadb
```

MariaDB 服务会自动配置，无需手动设置环境变量。

#### 方式三：使用 Docker Compose 启动 PostgreSQL

```bash
# 启动 PostgreSQL 数据库
docker-compose up -d postgres

# 等待数据库就绪后，设置环境变量
export AXONHUB_DB_DIALECT=postgres
export AXONHUB_DB_DSN="postgres://axonhub:axonhub_password@localhost:5432/axonhub?sslmode=disable"
```

#### 方式四：使用本地 PostgreSQL/MySQL/MariaDB

```bash
# PostgreSQL
export AXONHUB_DB_DIALECT=postgres
export AXONHUB_DB_DSN="postgres://user:password@localhost:5432/axonhub?sslmode=disable"

# MySQL
export AXONHUB_DB_DIALECT=mysql
export AXONHUB_DB_DSN="user:password@tcp(localhost:3306)/axonhub?charset=utf8mb4&parseTime=True&loc=Local"

# MariaDB（与 MySQL 兼容，使用相同的配置）
export AXONHUB_DB_DIALECT=mysql
export AXONHUB_DB_DSN="user:password@tcp(localhost:3306)/axonhub?charset=utf8mb4&parseTime=True&loc=Local"
```

### 3. 启动后端服务

#### 方式一：使用 Air 热重载（推荐）

```bash
# 安装 air（如果尚未安装）
go install github.com/air-verse/air@latest

# 启动后端（自动热重载）
air
```

#### 方式二：直接构建运行

```bash
# 构建后端
make build-backend

# 运行
./axonhub
```

后端服务将启动在 `http://localhost:8090`

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

## 🔧 开发配置

### 环境变量配置

可以通过环境变量覆盖配置：

```bash
# 服务器配置
export AXONHUB_SERVER_PORT=8090
export AXONHUB_SERVER_NAME="AxonHub Dev"
export AXONHUB_SERVER_DEBUG=true

# 数据库配置
export AXONHUB_DB_DIALECT=sqlite3
export AXONHUB_DB_DSN="file:axonhub.db?cache=shared&_fk=1"

# 日志配置
export AXONHUB_LOG_LEVEL=debug
export AXONHUB_LOG_ENCODING=console

# 前端 API 地址（如果需要）
export VITE_API_URL=http://localhost:8090
```

### 配置文件方式

也可以创建 `config.yml` 文件（参考 `config.example.yml`）：

```yaml
server:
  port: 8090
  debug: true

db:
  dialect: sqlite3
  dsn: "file:axonhub.db?cache=shared&_fk=1"

log:
  level: debug
  encoding: console
```

## 🛠️ 常用开发命令

### 代码生成

当修改了 Ent schema 或 GraphQL schema 后，需要重新生成代码：

```bash
make generate
```

### 构建项目

```bash
# 构建完整项目（前端 + 后端）
make build

# 仅构建后端
make build-backend

# 仅构建前端
cd frontend && pnpm build
```

### 运行测试

```bash
# 运行后端测试
go test ./...

# 运行特定测试
go test -v -run TestFunctionName ./path/to/package

# 运行 E2E 测试
bash ./scripts/e2e-test.sh

# 运行前端 E2E 测试
cd frontend
pnpm test:e2e
```

### 代码质量检查

```bash
# Go 代码检查
golangci-lint run -v

# 前端代码检查
cd frontend
pnpm lint
pnpm format:check

# 修复格式
pnpm format
```

### 清理测试数据

```bash
# 清理 Playwright 测试数据（SQLite）
make cleanup-db
```

## 📁 项目结构说明

```
axonhub/
├── cmd/axonhub/          # 主程序入口
├── internal/
│   ├── server/           # HTTP 服务器
│   │   ├── api/          # API 处理器
│   │   ├── biz/          # 业务逻辑层
│   │   ├── gql/          # GraphQL 接口
│   │   ├── orchestrator/ # 请求编排器
│   │   └── middleware/   # 中间件
│   ├── llm/              # LLM 处理核心
│   │   ├── pipeline/     # 请求处理管道
│   │   └── transformer/  # 格式转换器
│   └── ent/              # 数据库实体定义
├── frontend/             # React 前端应用
│   └── src/
│       ├── features/     # 功能模块
│       ├── components/   # UI 组件
│       └── routes/       # 路由定义
└── config.example.yml    # 配置文件示例
```

## 🐛 调试技巧

### 后端调试

1. **查看日志**：设置 `AXONHUB_LOG_LEVEL=debug` 查看详细日志
2. **使用调试器**：在 VS Code 或 GoLand 中设置断点调试
3. **检查数据库**：使用 SQLite 浏览器查看 `axonhub.db`

### 前端调试

1. **浏览器开发者工具**：F12 打开控制台
2. **React DevTools**：安装浏览器扩展
3. **网络请求**：查看 Network 标签页，检查 API 请求

### 常见问题

#### 1. 端口被占用

```bash
# 检查端口占用
lsof -i :8090  # 后端端口
lsof -i :5173  # 前端端口

# 修改端口
export AXONHUB_SERVER_PORT=8091
# 或修改 vite.config.ts 中的端口配置
```

#### 2. 数据库连接失败

- 检查数据库是否启动
- 验证 DSN 配置是否正确
- 检查数据库用户权限

#### 3. 前端无法连接后端

- 确认后端服务已启动
- 检查 `vite.config.ts` 中的代理配置
- 查看浏览器控制台的错误信息

#### 4. 代码生成失败

```bash
# 确保所有依赖已安装
go mod download
go mod tidy

# 重新生成
make generate
```

## 🔄 开发工作流

### 1. 创建功能分支

```bash
git checkout -b feature/your-feature-name
```

### 2. 进行开发

- 修改代码
- 运行测试确保通过
- 运行代码检查

### 3. 提交更改

```bash
git add .
git commit -m "feat: your feature description"
```

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：
- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `refactor:` 代码重构
- `test:` 测试相关

### 4. 推送并创建 Pull Request

```bash
git push origin feature/your-feature-name
```

## 📝 开发注意事项

### 后端开发

- **事务处理**：使用 `AbstractService.RunInTransaction` 处理数据库事务
- **错误处理**：使用项目统一的错误处理机制
- **日志记录**：使用 `internal/log` 包进行结构化日志记录

### 前端开发

- **包管理器**：必须使用 `pnpm`，不要使用 npm 或 yarn
- **GraphQL**：使用 GraphQL 进行数据查询，避免在前端过滤数据
- **搜索过滤**：必须使用防抖（debounce）避免过多请求
- **国际化**：新增功能必须添加中英文翻译
- **路由**：新增页面需要添加到 `sidebar.ts`

### 测试账号

前端测试时使用以下账号登录：
- **邮箱**: `my@example.com`
- **密码**: `pwd123456`

## 🎯 下一步

- 查看 [开发指南](docs/en/guides/development.md) 了解详细架构
- 查看 [API 文档](docs/en/api-reference/unified-api.md) 了解 API 使用
- 查看 [架构文档](docs/en/architecture/) 了解系统设计

## 💡 提示

- 开发时建议使用 SQLite，简单快速
- 使用 Air 进行后端热重载，提高开发效率
- 前端开发服务器已配置代理，无需手动处理 CORS
- 数据库迁移会在服务启动时自动执行

