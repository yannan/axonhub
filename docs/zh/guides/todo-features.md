# 后续优化项说明


## 1. 问题：计费明细问题

**现状**  
对外接口（OpenAI/Anthropic/Gemini 等模型 API、`/billing/usage`）仅返回标准 `usage`，不返回倍率与公式。

**目标**  
在不泄露敏感定价信息的前提下，让项目或管理维度接口可按需返回倍率与公式。

**返回规则（按接口维度）**  
- 项目维度接口（`/user/*`, `/project/*`）：不返回详情
- 管理维度接口（`/admin/*`）：允许按参数返回  
  - 请求参数：`include_billing_detail=true`

**返回字段建议**  
`billing_detail` 或 `axonhub_billing`：
- `group_multiplier`
- `model_multiplier`
- `completion_ratio`
- `billing_multiplier`
- `formula`
- `cache_token_ratio`（见问题 2）

**涉及文件**  
- `internal/server/api/billing_handler.go`（`/user`、`/project` 计费接口返回）  
- `internal/server/api/openai.go` / `internal/server/api/anthropic.go` / `internal/server/api/gemini.go`（模型 API 返回结构）  
- `docs/zh/api-reference/unified-api.md`（接口文档字段说明）

**ConsumptionRecord 说明**  
- 表：`consumption_records`  
- 作用：记录一次结算/消费的核心数据（模型、token 数、额度、trace 等）  
- `content` 字段：可扩展存放倍率快照（JSON 字符串）  
- 主要读取场景：项目/管理维度的计费查询与对账  


## 2. 问题：缺少缓存 token 倍率，计价公式需调整

**目标**  
支持缓存命中 token 的折扣倍率，并将其纳入计价公式。

**设置落点（追加到模型倍率接口）**  
- 新字段：`ModelPricing.CacheTokenRatio`（默认 `0.1`）  
- 通过模型倍率接口读取/更新，与现有模型定价同源

**涉及文件**  
- `internal/server/api/pricing.go`  
- `internal/ent/schema/pricing.go`  
- `internal/ent/schema/model.go`

**ModelPricing 说明**  
- 表：`model_pricings`  
- 作用：定义模型的计价方式与倍率（`quota` / `price`、补全倍率等）  
- 关键字段：`quota`, `price`, `completion_ratio`，以及新增的 `cache_token_ratio`  
- 读取场景：计费中间件计算额度、管理端定价配置与查询  

**新公式**  
`额度 = 分组倍率 × 模型倍率 × (命中缓存数 × 缓存倍率 + 未命中数 × 1.0 + 补全数 × 补全倍率)`

**字段映射**  
- 命中缓存数：`usage.prompt_cached_tokens`（缺失则为 0）  
- 未命中数：`usage.prompt_tokens - usage.prompt_cached_tokens`（负值取 0）  
- 补全数：`usage.completion_tokens`  
- 补全倍率：`ModelPricing.CompletionRatio`（为空则视为 1）  
- 缓存倍率：`ModelPricing.CacheTokenRatio`

**实现要点**  
- 在 `WithBilling` 中计算三类 token 数并套用新公式  
- 将 `cache_token_ratio` 与倍率快照一并写入 `ConsumptionRecord.content`  
- 返回明细时携带 `cache_token_ratio`，方便对账

**涉及文件**  
- `internal/server/middleware/billing.go`  
- `internal/pkg/billing/billing.go`  
- `internal/ent/schema/consumption.go`

**兼容策略**  
- `cache_token_ratio` 未配置时默认 `0.1`  
- `prompt_cached_tokens` 缺失按 0 处理，等价于旧公式

## 3. 问题: 基于固定价格计费
倍率设置和按照价格设置只是一个换算关系，最终接口存储都是按照倍率存储的，只是前端不同

假设要设置 GPT-4 的价格（官方定价：输入 $30/1M tokens，输出 $60/1M tokens）：

方式一：按倍率设置

模型倍率: 15
补全倍率: 20

方式二：按价格设置

输入价格: 30 $/1M tokens
输出价格: 60 $/1M tokens
两种方式最终效果完全相同，系统都会存储为：

json
{
  "ModelRatio": { "gpt-4": 15 },
  "CompletionRatio": { "gpt-4": 20 }
}