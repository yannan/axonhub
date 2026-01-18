# API Key 与用户 Token 的区别

本文档详细说明 AxonHub 中 API Key 和用户 Token (JWT) 的区别，以及它们的使用场景和计费机制。

## 一、核心区别

### 1. API Key（API 密钥）

**定义**: 用于调用模型 API 的认证凭证

**用途**:
- ✅ 调用模型 API（`/v1/chat/completions`, `/anthropic/v1/messages` 等）
- ✅ 程序化访问（SDK、脚本、应用集成）
- ✅ 生产环境使用

**认证方式**:
```http
Authorization: Bearer <api-key>
# 或
X-API-Key: <api-key>
```

**特点**:
- 存储在 `api_keys` 表中
- 关联到 **User** (`user_id`) 和 **Project** (`project_id`)
- 可以设置 IP 白名单限制
- 可以设置权限范围 (scopes)
- 可以配置 Profile（渠道选择、模型映射等）

**计费**: ✅ **需要计费** - 消耗关联 User 的额度

### 2. 用户 Token (JWT Token)

**定义**: 用户登录后获得的 JWT 令牌，用于管理界面和用户相关操作

**用途**:
- ✅ 访问管理界面 API（`/user/*`, `/admin/*`）
- ✅ 查看额度信息
- ✅ 查看使用记录
- ✅ 兑换充值码
- ✅ 管理配置（管理员）

**认证方式**:
```http
Authorization: Bearer <jwt-token>
```

**特点**:
- 通过登录接口 (`/admin/auth/signin`) 获取
- 包含用户 ID 信息
- 有过期时间
- 用于 Web 前端和管理界面

**计费**: ❌ **不需要计费** - 仅用于管理操作，不直接调用模型

## 二、使用场景对比

### API Key 使用场景

```bash
# 1. 调用 OpenAI 格式 API
curl -X POST https://your-domain.com/v1/chat/completions \
  -H "Authorization: Bearer <api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello"}]
  }'

# 2. 调用 Anthropic 格式 API
curl -X POST https://your-domain.com/anthropic/v1/messages \
  -H "X-API-Key: <api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello"}]
  }'

# 3. 使用 SDK（Python）
from openai import OpenAI

client = OpenAI(
    api_key="<api-key>",
    base_url="https://your-domain.com/v1"
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}]
)
```

**结果**: ✅ 会消耗 User 的额度，产生计费记录

### 用户 Token 使用场景

```bash
# 1. 查看额度信息
curl -X GET https://your-domain.com/user/billing/subscription \
  -H "Authorization: Bearer <jwt-token>"

# 2. 查看使用记录
curl -X GET https://your-domain.com/user/billing/usage \
  -H "Authorization: Bearer <jwt-token>"

# 3. 兑换充值码
curl -X POST https://your-domain.com/user/redemption/redeem \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"code": "REDEMPTION-CODE-123"}'

# 4. 管理员操作（需要管理员权限）
# 可选: ?model=关键字 按模型名称模糊搜索
curl -X GET "https://your-domain.com/admin/pricing?model=gpt" \
  -H "Authorization: Bearer <jwt-token>"
```

**结果**: ❌ 不会消耗额度，不产生计费记录

## 三、技术实现细节

### API Key 认证流程

**位置**: `internal/server/middleware/auth.go:WithAPIKeyAuth`

```go
func WithAPIKeyAuth(auth *biz.AuthService) gin.HandlerFunc {
    return func(c *gin.Context) {
        // 1. 从请求头提取 API Key
        key, err := ExtractAPIKeyFromRequest(c.Request, config)
        
        // 2. 验证 API Key 有效性
        apiKey, err := auth.AnthenticateAPIKey(c.Request.Context(), key)
        
        // 3. 检查 API Key 状态和项目状态
        if apiKey.Status != apikey.StatusEnabled {
            // 返回错误
        }
        
        // 4. 将 API Key 存入 Context
        ctx := contexts.WithAPIKey(c.Request.Context(), apiKey)
        if apiKey.Edges.Project != nil {
            ctx = contexts.WithProjectID(ctx, apiKey.Edges.Project.ID)
        }
        
        c.Request = c.Request.WithContext(ctx)
        c.Next()
    }
}
```

**关键点**:
- API Key 关联到 User (`apiKey.UserID`)
- API Key 关联到 Project (`apiKey.ProjectID`)
- 验证时会检查 API Key 状态和项目状态

### 用户 Token 认证流程

**位置**: `internal/server/middleware/auth.go:WithJWTAuth`

```go
func WithJWTAuth(auth *biz.AuthService) gin.HandlerFunc {
    return func(c *gin.Context) {
        // 1. 从请求头提取 JWT Token
        token, err := ExtractAPIKeyFromRequest(c.Request, &APIKeyConfig{
            Headers:       []string{"Authorization"},
            RequireBearer: true,
        })
        
        // 2. 验证 JWT Token
        user, err := auth.AuthenticateJWTToken(c.Request.Context(), token)
        
        // 3. 检查用户状态
        if user.Status != user.StatusActivated {
            // 返回错误
        }
        
        // 4. 将 User 存入 Context
        ctx := contexts.WithUser(c.Request.Context(), user)
        c.Request = c.Request.WithContext(ctx)
        c.Next()
    }
}
```

**关键点**:
- JWT Token 直接关联到 User
- 不涉及 Project（除非在业务逻辑中查询）
- 主要用于管理操作

### 计费中间件

**位置**: `internal/server/middleware/billing.go:WithBilling`

```go
func WithBilling(billingService *billing.BillingService) gin.HandlerFunc {
    return func(c *gin.Context) {
        // 1. 获取 API Key（只有 API Key 调用才计费）
        apiKey := contexts.GetAPIKey(c.Request.Context())
        if apiKey == nil {
            // 没有 API Key，跳过计费（通常是 JWT Token 调用）
            c.Next()
            return
        }
        
        // 2. 预检查：检查用户额度（TODO: 待实现）
        // user := apiKey.Edges.User
        // if user.Quota <= 0 {
        //     AbortWithError(c, http.StatusForbidden, errors.New("insufficient quota"))
        //     return
        // }
        
        // 3. 包装 ResponseWriter 以捕获响应
        w := &billingResponseWriter{body: &bytes.Buffer{}, ResponseWriter: c.Writer}
        c.Writer = w
        
        c.Next()
        
        // 4. 后处理：解析 Token 使用量并扣减额度
        if c.Writer.Status() == http.StatusOK {
            // 解析响应中的 usage 字段
            // 计算消耗额度
            // 异步扣减 User 额度
        }
    }
}
```

**关键点**:
- ✅ **只有 API Key 调用才经过计费中间件**
- ✅ **JWT Token 调用会跳过计费**（因为 `apiKey == nil`）
- 计费基于 API Key 关联的 User 的额度

## 四、路由配置对比

### API Key 路由（需要计费）

**位置**: `internal/server/routes.go:apiGroup`

```go
apiGroup := server.Group("/",
    middleware.WithTimeout(server.Config.LLMRequestTimeout),
    middleware.WithAPIKeyAuth(services.AuthService),      // API Key 认证
    middleware.WithSource(request.SourceAPI),
    middleware.WithBilling(services.BillingService),        // 计费中间件
    middleware.WithThread(server.Config.Trace, services.ThreadService),
    middleware.WithTrace(server.Config.Trace, services.TraceService),
)

// 模型 API 端点
openaiGroup := apiGroup.Group("/v1")
openaiGroup.POST("/chat/completions", handlers.OpenAI.ChatCompletion)
openaiGroup.POST("/embeddings", handlers.OpenAI.CreateEmbedding)
```

**特点**:
- ✅ 使用 `WithAPIKeyAuth` 认证
- ✅ 使用 `WithBilling` 计费
- ✅ 用于实际调用模型

### 用户 Token 路由（不需要计费）

**位置**: `internal/server/routes.go:userGroup` 和 `adminGroup`

```go
// 用户路由
userGroup := server.Group("/user", 
    middleware.WithJWTAuth(services.AuthService),        // JWT Token 认证
)
{
    userGroup.GET("/billing/subscription", handlers.Billing.GetSubscription)
    userGroup.GET("/billing/usage", handlers.Billing.GetUsage)
    userGroup.POST("/redemption/redeem", handlers.Redemption.RedeemCode)
}

// 管理员路由
adminGroup := server.Group("/admin", 
    middleware.WithJWTAuth(services.AuthService),        // JWT Token 认证
)
{
    adminGroup.POST("/pricing", handlers.Pricing.CreatePrice)
    adminGroup.GET("/pricing", handlers.Pricing.ListPrices)
}
```

**特点**:
- ✅ 使用 `WithJWTAuth` 认证
- ❌ **没有** `WithBilling` 计费中间件
- ✅ 用于管理操作，不直接调用模型

## 五、数据库关系

### API Key 表结构

```sql
CREATE TABLE api_keys (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,           -- 关联到 User
    project_id INT NOT NULL,        -- 关联到 Project
    key VARCHAR(255) UNIQUE,         -- API Key 值
    name VARCHAR(255),              -- API Key 名称
    type ENUM('user', 'service_account'),
    status ENUM('enabled', 'disabled', 'archived'),
    scopes JSON,                    -- 权限范围
    profiles JSON,                  -- Profile 配置
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

**关系**:
- `api_keys.user_id` → `users.id` (多对一)
- `api_keys.project_id` → `projects.id` (多对一)

### User 表结构（计费相关）

```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    quota DECIMAL(20, 2) DEFAULT 0,      -- 用户额度
    used_quota DECIMAL(20, 2) DEFAULT 0,   -- 已使用额度
    status ENUM('activated', 'deactivated'),
    ...
);
```

**计费逻辑**:
- API Key 调用时，从关联的 User 的 `quota` 中扣减
- 记录到 `consumption_records` 表
- 更新 User 的 `used_quota`

## 六、常见问题

### Q1: API Key 调用需要计费吗？

**A**: ✅ **是的，需要计费**

- API Key 调用会经过 `WithBilling` 中间件
- 消耗 API Key 关联的 User 的额度
- 产生消费记录 (`ConsumptionRecord`)

### Q2: 用户 Token 调用需要计费吗？

**A**: ❌ **不需要计费**

- 用户 Token 调用不经过 `WithBilling` 中间件
- 仅用于管理操作（查看额度、使用记录等）
- 不直接调用模型 API

### Q3: 如何获取 API Key？

**A**: 通过管理界面或 GraphQL API

```graphql
mutation CreateAPIKey {
  createAPIKey(input: {
    name: "My API Key"
    projectId: 1
  }) {
    id
    key
    name
  }
}
```

### Q4: 如何获取用户 Token？

**A**: 通过登录接口

```bash
curl -X POST https://your-domain.com/admin/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password"
  }'

# 响应
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {...}
}
```

### Q5: API Key 可以设置额度限制吗？

**A**: 目前 API Key 本身没有独立的额度限制

- 额度设置在 User 级别
- 所有属于同一 User 的 API Key 共享该 User 的额度
- 未来可能会支持 API Key 级别的额度限制

### Q6: 一个用户可以创建多个 API Key 吗？

**A**: ✅ **可以**

- 一个 User 可以创建多个 API Key
- 每个 API Key 可以属于不同的 Project
- 所有 API Key 共享 User 的额度

### Q7: API Key 和用户 Token 可以同时使用吗？

**A**: ✅ **可以，但用途不同**

- **API Key**: 用于调用模型 API（程序化访问）
- **用户 Token**: 用于管理界面（Web 前端）

它们可以同时存在，服务于不同的使用场景。

## 七、最佳实践

### 1. API Key 使用建议

- ✅ **生产环境**: 使用 API Key 调用模型 API
- ✅ **安全性**: 设置 IP 白名单限制
- ✅ **权限控制**: 使用 scopes 限制权限范围
- ✅ **管理**: 定期轮换 API Key
- ❌ **不要**: 在前端代码中暴露 API Key

### 2. 用户 Token 使用建议

- ✅ **管理界面**: 使用用户 Token 访问管理 API
- ✅ **安全性**: Token 有过期时间，定期刷新
- ✅ **权限**: 管理员 Token 可以访问更多功能
- ❌ **不要**: 使用用户 Token 调用模型 API（虽然技术上可能，但不推荐）

### 3. 计费监控

- ✅ 定期检查 User 的 `quota` 和 `used_quota`
- ✅ 查看 `consumption_records` 了解使用情况
- ✅ 设置额度告警（如果实现）

## 八、总结

| 特性 | API Key | 用户 Token (JWT) |
|------|---------|------------------|
| **用途** | 调用模型 API | 管理界面操作 |
| **认证方式** | `WithAPIKeyAuth` | `WithJWTAuth` |
| **计费** | ✅ 需要计费 | ❌ 不需要计费 |
| **关联对象** | User + Project | User |
| **使用场景** | SDK、脚本、应用集成 | Web 前端、管理界面 |
| **路由组** | `/v1/*`, `/anthropic/*` | `/user/*`, `/admin/*` |
| **额度消耗** | 消耗 User 额度 | 不消耗额度 |
| **记录** | 产生消费记录 | 不产生消费记录 |

**核心要点**:
- ✅ **API Key 调用需要计费** - 因为它是实际调用模型 API 的凭证
- ❌ **用户 Token 调用不需要计费** - 因为它仅用于管理操作
- 计费基于 API Key 关联的 User 的额度
- 两种认证方式服务于不同的使用场景，可以同时使用
