# AxonHub API 调用流程详解

本文档详细说明用户调用 AxonHub 提供的模型接口的完整流程，包括认证、计费、敏感词过滤等各个环节。

## 一、整体流程概览

```
用户请求 
  ↓
路由层 (routes.go)
  ↓
中间件链 (Middleware Chain)
  ├─ WithTimeout (超时控制)
  ├─ WithAPIKeyAuth (API密钥认证)
  ├─ WithSource (设置请求来源)
  ├─ WithBilling (计费处理)
  ├─ WithThread (线程追踪)
  └─ WithTrace (请求追踪)
  ↓
处理器层 (Handler)
  ├─ OpenAI.ChatCompletion
  ├─ Anthropic.CreateMessage
  ├─ Gemini.GenerateContent
  └─ ...
  ↓
编排器层 (Orchestrator)
  ├─ Inbound Transformer (请求格式转换)
  ├─ Pipeline 中间件链
  │   ├─ checkApiKeyModelAccess (模型访问权限检查)
  │   ├─ applyApiKeyModelMapping (模型映射)
  │   ├─ selectCandidates (选择渠道候选)
  │   ├─ persistRequest (持久化请求记录)
  │   └─ validateContent (敏感词过滤)
  ├─ Outbound Transformer (响应格式转换)
  └─ 转发到 LLM 提供商
  ↓
响应处理
  ├─ 流式响应 (SSE)
  └─ 非流式响应 (JSON)
  ↓
后处理
  ├─ 计费扣减 (异步)
  ├─ 使用记录 (Usage Log)
  └─ 追踪记录 (Trace)
```

## 二、详细流程说明

### 1. 请求入口 (routes.go)

用户通过以下端点发起请求：

- **OpenAI 格式**: `POST /v1/chat/completions`
- **Anthropic 格式**: `POST /anthropic/v1/messages`
- **Gemini 格式**: `POST /gemini/v1beta/models/*action`
- **嵌入**: `POST /v1/embeddings`
- **重排序**: `POST /v1/rerank`

所有 API 请求都通过 `apiGroup` 路由组处理：

```go
apiGroup := server.Group("/",
    middleware.WithTimeout(server.Config.LLMRequestTimeout),
    middleware.WithAPIKeyAuth(services.AuthService),
    middleware.WithSource(request.SourceAPI),
    middleware.WithBilling(services.BillingService),
    middleware.WithThread(server.Config.Trace, services.ThreadService),
    middleware.WithTrace(server.Config.Trace, services.TraceService),
)
```

### 2. 中间件链处理

#### 2.1 API 密钥认证 (WithAPIKeyAuth)

**位置**: `internal/server/middleware/auth.go`

**功能**:
- 从请求头提取 API Key (`Authorization: Bearer <key>` 或 `X-API-Key: <key>`)
- 查询数据库验证 API Key 有效性
- 检查 API Key 的 IP 白名单（如果配置）
- 将 API Key 实体和关联的用户、项目信息存入 Context

**关键代码**:
```go
apiKey, err := auth.AnthenticateAPIKey(c.Request.Context(), key)
ctx := contexts.WithAPIKey(c.Request.Context(), apiKey)
if apiKey.Edges.Project != nil {
    ctx = contexts.WithProjectID(ctx, apiKey.Edges.Project.ID)
}
```

**失败处理**: 返回 `401 Unauthorized`

#### 2.2 计费中间件 (WithBilling)

**位置**: `internal/server/middleware/billing.go`

**功能**:
- **预检查**: 检查用户额度是否充足（TODO: 待实现）
- **响应拦截**: 包装 ResponseWriter 以捕获响应内容
- **后处理**: 请求成功后解析响应中的 Token 使用量，异步扣减额度

**当前实现状态**:
- ✅ 响应捕获机制已实现
- ⚠️ 额度预检查待完善（代码中有 TODO）
- ⚠️ Token 解析和扣减逻辑待完善

**计费公式**（根据需求文档）:
```
额度 = 分组倍率 × 模型倍率 × (提示 token 数 + 补全 token 数 × 补全倍率)
```

#### 2.3 追踪中间件 (WithTrace / WithThread)

**功能**:
- 创建或关联 Trace ID（如果请求头中包含 `AH-Trace-Id`）
- 创建或关联 Thread ID（如果请求头中包含 `AH-Thread-Id`）
- 记录请求的完整生命周期

### 3. 处理器层 (Handler)

**位置**: `internal/server/api/openai.go`, `anthropic.go`, `gemini.go`

**功能**:
- 解析 HTTP 请求为内部请求格式 (`httpclient.Request`)
- 调用编排器 (Orchestrator) 处理请求
- 处理响应（流式或非流式）
- 错误转换和返回

**示例** (OpenAI ChatCompletion):
```go
func (handlers *OpenAIHandlers) ChatCompletion(c *gin.Context) {
    genericReq, err := httpclient.ReadHTTPRequest(c.Request)
    result, err := handlers.ChatCompletionOrchestrator.Process(ctx, genericReq)
    
    if result.ChatCompletionStream != nil {
        // 流式响应处理
        streamWriter(c, result.ChatCompletionStream)
    } else {
        // 非流式响应处理
        c.Data(resp.StatusCode, contentType, resp.Body)
    }
}
```

### 4. 编排器层 (Orchestrator)

**位置**: `internal/server/orchestrator/orchestrator.go`

这是核心处理逻辑，负责请求的完整生命周期管理。

#### 4.1 Inbound Transformer (请求转换)

**功能**:
- 将外部 API 格式（OpenAI/Anthropic/Gemini）转换为内部统一格式 (`llm.Request`)
- 解析模型名称、消息内容、参数等

#### 4.2 Pipeline 中间件链

##### 4.2.1 模型访问权限检查 (checkApiKeyModelAccess)

**功能**:
- 检查 API Key 是否有权限访问请求的模型
- 验证模型是否在 API Key 的允许列表中

##### 4.2.2 模型映射 (applyApiKeyModelMapping)

**功能**:
- 根据 API Key 的配置，将用户请求的模型映射到实际可用的模型
- 支持模型别名和路由规则

##### 4.2.3 选择渠道候选 (selectCandidates)

**功能**:
- 根据模型名称查找可用的渠道（Channel）
- 应用负载均衡策略（自适应或加权）
- 考虑 Profile 配置（ChannelIDs、ChannelTags 过滤）
- 支持重试策略（多候选渠道）

**关键逻辑**:
```go
candidates, err := selector.Select(ctx, llmRequest.Model)
// 应用负载均衡
if loadBalancer != nil {
    candidates = loadBalancer.Select(candidates)
}
```

##### 4.2.4 持久化请求记录 (persistRequest)

**功能**:
- 创建 Request 记录到数据库
- 记录请求的元数据（模型、用户、项目等）
- 后续用于追踪和统计

##### 4.2.5 敏感词过滤 (validateContent)

**位置**: `internal/server/orchestrator/orchestrator.go:253`

**功能**:
- **请求过滤**: 检查请求内容是否包含敏感词
- **响应过滤**: 检查响应内容是否包含敏感词（非流式）
- 使用 Aho-Corasick 算法进行高效匹配

**实现**:
```go
if engine != nil {
    if valid, word := engine.Validate(string(request.Body)); !valid {
        return nil, fmt.Errorf("content blocked: sensitive word '%s' found", word)
    }
}
```

**策略**（根据需求文档）:
- 命中敏感词时，记录 `status: blocked`
- 返回包含敏感信息提示的错误
- **不扣除该次请求额度**

#### 4.3 Outbound Transformer (响应转换)

**功能**:
- 将内部统一格式转换为目标渠道的 API 格式
- 应用渠道特定的请求头和参数
- 处理模型名称映射（实际模型名称）

#### 4.4 转发到 LLM 提供商

**功能**:
- 通过 HTTP 客户端发送请求到实际的 LLM 提供商
- 支持流式和非流式响应
- 处理重试逻辑（如果配置）
- 记录请求执行状态

### 5. 响应处理

#### 5.1 流式响应 (SSE)

**格式**: Server-Sent Events (SSE)
```
data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk",...}

data: [DONE]
```

**处理**:
- 逐块读取并转发给客户端
- 实时累加 Token 使用量（从 usage 字段）
- 流式响应结束时进行计费扣减

#### 5.2 非流式响应 (JSON)

**格式**: 标准 JSON 响应
```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "choices": [...],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

**处理**:
- 解析完整的 JSON 响应
- 提取 Token 使用量
- 进行计费扣减

### 6. 后处理

#### 6.1 计费扣减（异步）

**位置**: `internal/server/middleware/billing.go` (后处理部分)

**流程**:
1. 解析响应中的 `usage` 字段
2. 根据模型定价计算消耗额度
3. 异步扣除用户额度（避免阻塞）
4. 记录消费记录 (`ConsumptionRecord`)

**计费计算**:
```go
quota, err := billingService.CalculateQuota(ctx, modelName, promptTokens, completionTokens)
// 公式: 分组倍率 × 模型倍率 × (提示token + 补全token × 补全倍率)
```

#### 6.2 使用记录 (Usage Log)

**位置**: `internal/server/orchestrator/request.go`

**功能**:
- 记录每次请求的 Token 使用情况
- 关联到 Request 和 RequestExecution
- 用于统计和报表

#### 6.3 追踪记录 (Trace)

**功能**:
- 记录请求的完整追踪信息
- 包含请求、响应、错误等详细信息
- 支持在 Tracing 详情中显示 `cost` 字段（扣费金额）

## 三、关键功能点

### 1. 计费功能

**当前状态**:
- ✅ 计费中间件框架已实现
- ✅ 模型定价表 (`ModelPricing`) 已定义
- ⚠️ 额度预检查待完善
- ⚠️ 异步扣费逻辑待完善
- ⚠️ 流式响应的 Token 累加待完善

**待实现**（根据需求文档）:
- 用户额度设置在 User 表
- 分组倍率配置（Groups）
- 模型倍率配置（Abilities）
- 渠道分组选型（default, vip, svip）
- 缓存适配（Redis，避免重复计费）
- 异常回滚（AI 响应失败不扣费）

### 2. 敏感词过滤

**当前状态**:
- ✅ 敏感词过滤中间件已实现
- ✅ Aho-Corasick 算法引擎已集成
- ✅ 请求和响应过滤已实现
- ⚠️ 流式响应的敏感词检测待完善

**实现方式**:
- 使用 `filter.ValidationEngine` 进行敏感词匹配
- 在 Pipeline 的 `validateContent` 中间件中执行
- 命中敏感词时返回错误，不扣除额度

### 3. 充值功能

**当前状态**:
- ✅ 兑换码表 (`RedemptionCode`) 已定义
- ✅ 充值记录表 (`RechargeRecord`) 已定义
- ✅ 管理员生成兑换码接口已实现
- ✅ 用户兑换接口已实现

**功能**:
- 管理员批量/单个生成兑换码
- 用户使用兑换码充值额度
- 记录充值历史

## 四、错误处理

### 常见错误场景

1. **认证失败** (`401 Unauthorized`)
   - API Key 无效
   - IP 不在白名单中

2. **额度不足** (`403 Forbidden`)
   - 用户额度不足（预检查）
   - 预扣费失败

3. **敏感词拦截** (`400 Bad Request`)
   - 请求或响应包含敏感词
   - 不扣除额度

4. **模型不可用** (`404 Not Found`)
   - 模型不存在
   - 无可用渠道

5. **上游错误** (`502 Bad Gateway`)
   - LLM 提供商服务异常
   - 网络超时

## 五、性能优化

### 1. 异步处理
- 计费扣减异步执行，不阻塞响应
- 使用独立 Context 确保持久化完成

### 2. 缓存机制
- 模型定价缓存（避免频繁查询）
- 敏感词树缓存（启动时构建）

### 3. 流式处理
- 流式响应实时转发，不缓存完整响应
- Token 累加在流式过程中完成

## 六、扩展点

### 1. 自定义中间件
可以在 Orchestrator 的 Pipeline 中添加自定义中间件：
```go
middlewares = append(middlewares, customMiddleware)
```

### 2. 自定义 Transformer
可以实现自定义的 Inbound/Outbound Transformer 支持新的 API 格式。

### 3. 自定义负载均衡
可以实现自定义的 LoadBalancer 接口，支持特殊的负载均衡策略。

## 七、总结

AxonHub 的 API 调用流程采用了清晰的分层架构：

1. **路由层**: 负责请求路由和中间件编排
2. **处理器层**: 负责请求解析和响应格式化
3. **编排器层**: 负责核心业务逻辑（模型选择、格式转换、转发）
4. **后处理层**: 负责计费、记录、追踪等

整个流程支持：
- ✅ 多 API 格式（OpenAI、Anthropic、Gemini）
- ✅ 多提供商支持（OpenAI、Anthropic、智谱、Moonshot 等）
- ✅ 流式和非流式响应
- ✅ 重试和负载均衡
- ✅ 敏感词过滤
- ⚠️ 计费功能（部分实现，待完善）

通过这种架构设计，AxonHub 实现了统一、灵活、可扩展的 API 网关功能。

