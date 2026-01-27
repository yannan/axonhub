# 兑换码、账单、倍率设置后端实现逻辑

本文档梳理兑换码（充值）、账单（消费结算）与倍率设置（分组/模型）的核心后端流程与数据落地，便于对账与排查问题。

## 1. 兑换码（充值）逻辑

### 1.1 数据模型
- `RedemptionCode`：兑换码主体，包含额度、状态、过期、使用次数等信息。
- `RechargeRecord`：充值记录，关联用户/项目/兑换码，记录充值额度与 trace。

字段来源：`internal/ent/schema/redemption.go`、`internal/ent/schema/recharge.go`。

### 1.2 管理端接口
路由定义：`internal/server/routes.go`
- `POST /admin/redemption/generate`：生成兑换码（可批量 + 可选导出 CSV）。
- `GET /admin/redemption`：列表/筛选兑换码。
- `POST /admin/redemption/:id/void`：作废兑换码。
- `POST /admin/redemption/delete`：删除兑换码。
- `GET /admin/redemption/recharges`：查询充值记录（user_id/project_id/code_id/status 过滤）。

实现：`internal/server/api/redemption.go`

### 1.3 兑换流程（用户/项目）
接口：`POST /user/redemption/redeem` / `POST /project/redemption/redeem`  
实现：`internal/pkg/redemption/redemption.go` + `internal/server/api/redemption.go`

核心流程（事务内）：
1. 兑换码行锁读取（非 SQLite 时 `FOR UPDATE`）。
2. 幂等判断：如果同一 `project_id + code_id` 已存在 `RechargeRecord`，直接返回额度。
3. 业务校验：
   - `status` 必须是 `active`
   - `voided` 必须为 `false`
   - `expires_at` 未过期
   - 未超过 `max_uses`
4. 项目余额增加：`Project.AddQuota(+quota)`
5. 更新兑换码：`used_by / used_at / used_times`，达到上限后置为 `used`
6. 生成 `RechargeRecord`（成功状态，写入 trace_id）
7. 提交事务并记录日志

## 2. 账单（消费结算）逻辑

### 2.1 入口与预扣
计费中间件：`internal/server/middleware/billing.go`  
生效场景：仅对 `POST` 请求，且上下文中存在 API Key。

预扣流程：
1. 解析请求体：模型名、max_tokens、估算 prompt tokens。
2. 读取 `ModelPricing`（带缓存）：`billing.GetModelPricing`。
3. 读取项目与分组倍率，估算预扣额度：`EstimatePreQuotaWithPricing`。
4. 项目余额不足直接拒绝；充足则先扣除 `preQuota`。

### 2.2 结算（实际扣费）
请求成功后（HTTP 200）执行结算：
1. 解析响应中的 usage（支持流式 SSE）。
2. 计算实际消耗：`CalculateActualQuotaWithPricing`。
3. 结算任务包含：项目/用户/模型、实际额度、差额（actual - pre）、token 明细等。
4. 先同步结算（带重试），失败后进入异步队列（保障最终一致）。

### 2.3 结算落库
`billing.Settle` 会在事务内完成：
- 更新项目已用额度 `Project.AddUsedQuota(actual)`
- 若预扣差异，补扣或退回 `Project.AddQuota(-delta)`
- 写入 `ConsumptionRecord`
- 若有 trace_id，同时更新 `Trace.cost`

`ConsumptionRecord.content` 在倍率可用时写入 JSON 快照：
`billing_multiplier / group_multiplier / model_multiplier / completion_ratio`

字段与实体：`internal/ent/schema/consumption.go`。

## 3. 倍率设置逻辑

### 3.1 分组倍率（group_ratio）
设置入口：`PUT /admin/system/settings`  
读取入口：`GET /admin/system/settings?key=group_ratio`  
实现：`internal/server/api/settings_handler.go` + `internal/server/biz/settings_service.go`

约束校验：
- `group_ratio` 必须非空
- 取值必须是非负数（float/int/json.Number）

默认值：
- 未配置时返回 `{"default": 1.0}`

倍率解析：`billing.ResolveGroupMultiplier`
- 支持逗号分隔多组（取最大倍率）。
- key 统一小写/去空格。
- ratios 为空时默认返回 1。

### 3.2 可选分组（user_selectable_groups）
同样通过 `system_settings` 存储与读取（用于前端分组选择展示）。
校验：value 必须是非空字符串映射。

### 3.3 模型倍率（model_pricings）
来源：`ModelPricing`（`internal/ent/schema/pricing.go`）
影响字段：
- `Type = quota` 时使用 `quota` + `completion_ratio`
- `Type != quota` 时使用固定 `price`

结算时的倍率组合：
- `group_multiplier`：由分组倍率解析
- `model_multiplier`：`pricing.Quota`
- `completion_ratio`：`pricing.CompletionRatio`（默认 1）
- `billing_multiplier`：`model_multiplier * group_multiplier`

## 4. 相关代码索引
- 兑换码服务：`internal/pkg/redemption/redemption.go`
- 兑换码接口：`internal/server/api/redemption.go`
- 充值记录模型：`internal/ent/schema/recharge.go`
- 消费记录模型：`internal/ent/schema/consumption.go`
- 计费逻辑：`internal/pkg/billing/billing.go`
- 计费中间件：`internal/server/middleware/billing.go`
- 系统设置：`internal/server/biz/settings_service.go`
- 系统设置接口：`internal/server/api/settings_handler.go`
