# Token 计费机制对比：new-api vs AxonHub

本文档对比 new-api 和 AxonHub 在处理用户 Token 调用模型 API 时的不同设计。

## 一、核心概念差异

### new-api 的设计

**Token = API Key**

在 new-api 中，**Token 就是用于调用模型 API 的凭证**，类似于 AxonHub 中的 API Key。

- Token 存储在 `tokens` 表中
- Token 可以有自己的额度 (`RemainQuota`)
- Token 也可以使用用户额度
- 所有模型 API 调用都使用 Token 认证 (`TokenAuth()`)

### AxonHub 的设计

**API Key ≠ JWT Token**

在 AxonHub 中，API Key 和 JWT Token 是**完全分离**的两个概念：

- **API Key**: 用于调用模型 API，存储在 `api_keys` 表
- **JWT Token**: 用于管理界面，通过登录获取，不存储在数据库

## 二、new-api 的 Token 计费机制

### 1. Token 认证流程

**位置**: `new-api/middleware/auth.go:TokenAuth()`

```go
func TokenAuth() func(c *gin.Context) {
    return func(c *gin.Context) {
        // 1. 从请求头提取 Token (格式: sk-xxx)
        key := c.Request.Header.Get("Authorization")
        key = strings.TrimPrefix(key, "Bearer ")
        key = strings.TrimPrefix(key, "sk-")
        
        // 2. 验证 Token
        token, err := model.ValidateUserToken(key)
        
        // 3. 检查 IP 白名单
        allowIps := token.GetIpLimits()
        if len(allowIps) > 0 {
            // 验证客户端 IP
        }
        
        // 4. 检查用户状态
        userCache, err := model.GetUserCache(token.UserId)
        if !userEnabled {
            // 返回错误
        }
        
        // 5. 设置 Context
        c.Set("id", token.UserId)
        c.Set("token_id", token.Id)
        c.Set("token_quota", token.RemainQuota)
        c.Set("token_unlimited_quota", token.UnlimitedQuota)
        
        c.Next()
    }
}
```

**关键点**:
- Token 关联到 User (`token.UserId`)
- Token 可以有自己的额度 (`token.RemainQuota`)
- Token 可以是无限额度 (`token.UnlimitedQuota`)

### 2. 计费逻辑

**位置**: `new-api/service/pre_consume_quota.go:PreConsumeQuota()`

```go
func PreConsumeQuota(c *gin.Context, preConsumedQuota int, relayInfo *relaycommon.RelayInfo) {
    // 1. 检查用户额度
    userQuota, err := model.GetUserQuota(relayInfo.UserId, false)
    if userQuota <= 0 {
        return error("用户额度不足")
    }
    
    // 2. 信任模式判断
    trustQuota := common.GetTrustQuota() // 通常是 1000000
    
    if userQuota > trustQuota {
        // 用户额度充足
        if !relayInfo.TokenUnlimited {
            tokenQuota := c.GetInt("token_quota")
            if tokenQuota > trustQuota {
                // Token 额度也充足，信任模式，不预扣费
                preConsumedQuota = 0
                return nil
            }
        } else {
            // 无限额度 Token，不预扣费
            preConsumedQuota = 0
            return nil
        }
    }
    
    // 3. 预扣费：同时扣减 Token 额度和用户额度
    if preConsumedQuota > 0 {
        // 扣减 Token 额度
        err := PreConsumeTokenQuota(relayInfo, preConsumedQuota)
        
        // 扣减用户额度
        err = model.DecreaseUserQuota(relayInfo.UserId, preConsumedQuota)
    }
    
    return nil
}
```

**计费策略**:

1. **双重额度检查**:
   - 检查用户额度 (`user.quota`)
   - 检查 Token 额度 (`token.remain_quota`)

2. **信任模式**:
   - 如果用户额度 > 信任阈值（如 100万）
   - 且 Token 额度也充足（或无限）
   - 则**不预扣费**，请求结束后再扣费

3. **预扣费模式**:
   - 如果额度不足，先预扣费
   - **同时扣减 Token 额度和用户额度**
   - 请求失败时返还预扣费

4. **最终扣费**:
   - 请求成功后，根据实际 Token 使用量扣费
   - **同时扣减 Token 额度和用户额度**

### 3. Token 额度 vs 用户额度

**new-api 的计费逻辑**:

```go
// 最终扣费时 (PostConsumeQuota)
func PostConsumeQuota(relayInfo *relaycommon.RelayInfo, quota int) {
    // 1. 扣减用户额度
    if quota > 0 {
        err = model.DecreaseUserQuota(relayInfo.UserId, quota)
    }
    
    // 2. 扣减 Token 额度（如果不是 Playground）
    if !relayInfo.IsPlayground {
        if quota > 0 {
            err = model.DecreaseTokenQuota(relayInfo.TokenId, relayInfo.TokenKey, quota)
        }
    }
}
```

**关键点**:
- ✅ **Token 额度和用户额度都会扣减**
- ✅ Token 额度是**独立的**，可以单独设置
- ✅ 如果 Token 额度用完，即使用户额度充足，也无法使用
- ✅ 如果用户额度用完，即使 Token 额度充足，也无法使用

## 三、AxonHub 的设计

### 1. API Key 认证

**位置**: `axonhub/internal/server/middleware/auth.go:WithAPIKeyAuth()`

```go
func WithAPIKeyAuth(auth *biz.AuthService) gin.HandlerFunc {
    return func(c *gin.Context) {
        // 1. 提取 API Key
        key, err := ExtractAPIKeyFromRequest(c.Request, config)
        
        // 2. 验证 API Key
        apiKey, err := auth.AnthenticateAPIKey(c.Request.Context(), key)
        
        // 3. 存入 Context
        ctx := contexts.WithAPIKey(c.Request.Context(), apiKey)
        c.Request = c.Request.WithContext(ctx)
        
        c.Next()
    }
}
```

**关键点**:
- API Key 关联到 User (`apiKey.UserID`)
- API Key **没有独立的额度**
- 额度设置在 User 级别

### 2. JWT Token 认证

**位置**: `axonhub/internal/server/middleware/auth.go:WithJWTAuth()`

```go
func WithJWTAuth(auth *biz.AuthService) gin.HandlerFunc {
    return func(c *gin.Context) {
        // 1. 提取 JWT Token
        token, err := ExtractAPIKeyFromRequest(c.Request, &APIKeyConfig{
            Headers:       []string{"Authorization"},
            RequireBearer: true,
        })
        
        // 2. 验证 JWT Token
        user, err := auth.AuthenticateJWTToken(c.Request.Context(), token)
        
        // 3. 存入 Context
        ctx := contexts.WithUser(c.Request.Context(), user)
        c.Request = c.Request.WithContext(ctx)
        
        c.Next()
    }
}
```

**关键点**:
- JWT Token 直接关联到 User
- 不存储在数据库（JWT 是无状态的）
- 用于管理界面，不用于模型 API

### 3. 路由配置

**模型 API 路由** (`/v1/chat/completions` 等):

```go
apiGroup := server.Group("/",
    middleware.WithAPIKeyAuth(services.AuthService),  // 只接受 API Key
    middleware.WithBilling(services.BillingService),
)
```

**管理界面路由** (`/user/*`, `/admin/*`):

```go
userGroup := server.Group("/user", 
    middleware.WithJWTAuth(services.AuthService),  // 只接受 JWT Token
    // 没有 WithBilling 中间件
)
```

### 4. 如果使用 JWT Token 调用模型 API？

**结果**: ❌ **会被拒绝**

```go
// 在 WithAPIKeyAuth 中
apiKey, err := auth.AnthenticateAPIKey(c.Request.Context(), key)
if err != nil {
    // JWT Token 不是有效的 API Key
    AbortWithError(c, http.StatusUnauthorized, errors.New("Invalid API key"))
    return
}
```

**原因**:
- JWT Token 不是 API Key，无法通过 `AuthenticateAPIKey` 验证
- 返回 `401 Unauthorized`

## 四、对比总结

| 特性 | new-api | AxonHub |
|------|---------|---------|
| **Token 概念** | Token = API Key（用于调用模型） | API Key ≠ JWT Token（分离） |
| **Token 额度** | ✅ Token 可以有独立额度 | ❌ API Key 没有独立额度 |
| **计费对象** | Token 额度 + 用户额度（双重） | 仅用户额度 |
| **JWT Token 调用模型** | ✅ 可以（如果 JWT 也是 Token） | ❌ 不可以（会被拒绝） |
| **信任模式** | ✅ 支持（额度充足时不预扣费） | ⚠️ 待实现 |
| **预扣费** | ✅ 支持 | ⚠️ 待实现 |

## 五、new-api 如何处理"一直使用用户 token 调用模型"

### 场景分析

在 new-api 中，**Token 就是用于调用模型的凭证**，所以不存在"用 JWT Token 调用模型"的问题。

但是，如果用户**一直使用同一个 Token** 调用模型，new-api 的处理方式是：

### 1. 额度检查

```go
// 每次请求都会检查
userQuota := model.GetUserQuota(userId, false)
tokenQuota := token.RemainQuota

// 必须同时满足
if userQuota <= 0 || (tokenQuota <= 0 && !token.UnlimitedQuota) {
    return error("额度不足")
}
```

### 2. 计费扣减

```go
// 每次请求都会扣费
PostConsumeQuota(relayInfo, quota) {
    // 同时扣减用户额度和 Token 额度
    DecreaseUserQuota(userId, quota)
    DecreaseTokenQuota(tokenId, quota)
}
```

### 3. 额度耗尽处理

- **用户额度耗尽**: 所有 Token 都无法使用
- **Token 额度耗尽**: 该 Token 无法使用，但其他 Token 仍可使用（如果用户额度充足）

### 4. 无限额度 Token

```go
if token.UnlimitedQuota {
    // Token 额度无限，只检查用户额度
    // 不扣减 Token 额度，只扣减用户额度
}
```

## 六、AxonHub 的对应处理

### 如果用户一直使用 API Key 调用模型

**当前实现**:

```go
// 计费中间件
func WithBilling(billingService *billing.BillingService) {
    apiKey := contexts.GetAPIKey(c.Request.Context())
    if apiKey == nil {
        // 没有 API Key，跳过计费
        c.Next()
        return
    }
    
    // TODO: 检查用户额度
    // user := apiKey.Edges.User
    // if user.Quota <= 0 {
    //     AbortWithError(c, http.StatusForbidden, errors.New("insufficient quota"))
    //     return
    // }
    
    // TODO: 扣减用户额度
}
```

**待完善**:
- ⚠️ 额度预检查（TODO）
- ⚠️ 额度扣减逻辑（TODO）
- ⚠️ 消费记录（部分实现）

### 如果用户使用 JWT Token 调用模型 API

**结果**: ❌ **会被拒绝**

```bash
# 尝试使用 JWT Token 调用模型 API
curl -X POST https://your-domain.com/v1/chat/completions \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{"model": "gpt-4o", "messages": [...]}'

# 响应
{
  "error": "Invalid API key"
}
```

**原因**:
- JWT Token 无法通过 `WithAPIKeyAuth` 验证
- 返回 `401 Unauthorized`

## 七、设计考虑

### new-api 的设计优势

1. ✅ **灵活性**: Token 可以有独立额度，适合多租户场景
2. ✅ **细粒度控制**: 可以为不同 Token 设置不同额度限制
3. ✅ **信任模式**: 额度充足时不预扣费，提高性能

### AxonHub 的设计优势

1. ✅ **职责分离**: API Key 和 JWT Token 职责清晰
2. ✅ **安全性**: JWT Token 不能直接调用模型 API
3. ✅ **简化**: API Key 不管理额度，统一由 User 管理

### 潜在问题

**new-api**:
- Token 和用户额度双重管理，可能造成混淆
- 如果 Token 额度用完但用户额度充足，仍无法使用

**AxonHub**:
- 如果用户想用 JWT Token 调用模型，需要先创建 API Key
- API Key 没有独立额度，无法实现细粒度控制

## 八、建议

### 对于 AxonHub

如果需要支持类似 new-api 的功能，可以考虑：

1. **API Key 独立额度**（可选）:
   ```go
   type APIKey struct {
       UserID int
       Quota  *int64  // 可选：独立额度
       UnlimitedQuota bool
   }
   ```

2. **允许 JWT Token 调用模型**（不推荐）:
   - 修改 `WithAPIKeyAuth` 支持 JWT Token
   - 但会破坏职责分离原则

3. **保持当前设计**（推荐）:
   - 明确区分 API Key 和 JWT Token
   - 用户必须创建 API Key 才能调用模型
   - 额度统一由 User 管理

## 九、总结

### new-api
- ✅ Token 就是 API Key，用于调用模型
- ✅ Token 可以有独立额度
- ✅ 计费时同时扣减 Token 额度和用户额度
- ✅ 支持信任模式（额度充足时不预扣费）

### AxonHub
- ✅ API Key 和 JWT Token 分离
- ✅ API Key 用于调用模型，JWT Token 用于管理界面
- ✅ 额度统一由 User 管理
- ❌ JWT Token 不能调用模型 API（会被拒绝）

**核心区别**:
- new-api: Token = API Key，可以有独立额度
- AxonHub: API Key ≠ JWT Token，额度统一管理

**如果用户一直使用 Token 调用模型**:
- new-api: 正常计费，同时扣减 Token 额度和用户额度
- AxonHub: 如果使用 JWT Token，会被拒绝；必须使用 API Key

