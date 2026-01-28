# GraphQL API

本文档基于当前项目 GraphQL schema 生成，适用于 `/admin/graphql` 接口。

## 入口与鉴权

- GraphQL Endpoint: `POST /admin/graphql`
- Playground: `GET /admin/playground`
- 鉴权方式: `Authorization: Bearer <JWT>`
  - JWT 来自 `/admin/auth/signin`

## 请求格式

`Content-Type: application/json`

```json
{
  "query": "query MyQuery { me { id email } }",
  "variables": {},
  "operationName": "MyQuery"
}
```

## Schema 来源

完整 schema 由以下文件组合生成（gqlgen）：

- `axonhub/internal/server/gql/ent.graphql`（Ent 自动生成：实体类型、连接查询、过滤/排序输入、Node 接口等）
- `axonhub/internal/server/gql/axonhub.graphql`
- `axonhub/internal/server/gql/dashboard.graphql`
- `axonhub/internal/server/gql/scopes.graphql`
- `axonhub/internal/server/gql/me.graphql`
- `axonhub/internal/server/gql/system.graphql`
- `axonhub/internal/server/gql/model.graphql`

## Root Operations

### Query（自定义扩展）

来自 `axonhub.graphql`：

- `allChannelTags: [String!]!`
- `countChannelsByType(input: CountChannelsByTypeInput!): [ChannelTypeCount!]!`
- `queryChannels(input: QueryChannelInput!): ChannelConnection!`
- `queryChannelOverrideTemplates(input: QueryChannelOverrideTemplatesInput!): ChannelOverrideTemplateConnection!`

来自 `dashboard.graphql`：

- `dashboardOverview: DashboardOverview!`
- `requestStats: RequestStats!`
- `requestStatsByChannel: [RequestStatsByChannel!]!`
- `requestStatsByModel: [RequestStatsByModel!]!`
- `dailyRequestStats: [DailyRequestStats!]!`
- `topRequestsProjects: [TopRequestsProjects!]!`
- `tokenStats: TokenStats!`
- `channelSuccessRates: [ChannelSuccessRate!]!`

来自 `scopes.graphql`：

- `allScopes(level: String): [ScopeInfo!]!`

来自 `me.graphql`：

- `me: UserInfo!`
- `myProjects: [Project!]!`

来自 `system.graphql`：

- `systemStatus: SystemStatus!`
- `brandSettings: BrandSettings!`
- `storagePolicy: StoragePolicy!`
- `retryPolicy: RetryPolicy!`
- `systemModelSettings: SystemModelSettings!`
- `defaultDataStorageID: ID`
- `onboardingInfo: OnboardingInfo`
- `systemVersion: SystemVersion!`
- `checkForUpdate: VersionCheck!`

来自 `model.graphql`：

- `fetchModels(input: FetchModelsInput!): FetchModelsPayload!`
- `queryModels(input: QueryModelsInput!): [ModelIdentityWithStatus!]!`
- `queryModelChannelConnections(associations: [ModelAssociationInput!]!): [ModelChannelConnection!]!`
- `queryUnassociatedChannels: [UnassociatedChannel!]!`

### Query（Ent 自动生成）

基础查询位于 `ent.graphql`，包含：

- Relay Node 查询：`node(id: ID!): Node`、`nodes(ids: [ID!]!): [Node]!`
- 各实体连接查询（例如 `apiKeys`, `channels`, `projects`, `models`, `users`, `usageLogs` 等）
- 连接查询普遍支持 `after/first/before/last` 及 `where/orderBy` 参数

### Mutation（自定义）

来自 `axonhub.graphql`：

- 渠道管理：`createChannel`, `bulkCreateChannels`, `updateChannel`, `updateChannelStatus`, `deleteChannel`, `bulkArchiveChannels`, `bulkDisableChannels`, `bulkEnableChannels`, `bulkDeleteChannels`, `testChannel`, `bulkImportChannels`, `bulkUpdateChannelOrdering`
- API Key 管理：`createAPIKey`, `updateAPIKey`, `updateAPIKeyStatus`, `updateAPIKeyProfiles`, `bulkDisableAPIKeys`, `bulkEnableAPIKeys`, `bulkArchiveAPIKeys`
- 用户与角色：`createUser`, `updateUser`, `updateUserStatus`, `createRole`, `updateRole`, `deleteRole`, `bulkDeleteRoles`
- 项目管理：`createProject`, `updateProject`, `updateProjectStatus`
- 项目成员：`addUserToProject`, `removeUserFromProject`, `updateProjectUser`
- 数据存储：`createDataStorage`, `updateDataStorage`
- 渠道模板：`createChannelOverrideTemplate`, `updateChannelOverrideTemplate`, `deleteChannelOverrideTemplate`, `applyChannelOverrideTemplate`

来自 `me.graphql`：

- `updateMe(input: UpdateMeInput!): User!`

来自 `system.graphql`：

- `updateBrandSettings(input: UpdateBrandSettingsInput!): Boolean!`
- `updateStoragePolicy(input: UpdateStoragePolicyInput!): Boolean!`
- `updateRetryPolicy(input: UpdateRetryPolicyInput!): Boolean!`
- `updateSystemModelSettings(input: UpdateSystemModelSettingsInput!): Boolean!`
- `updateDefaultDataStorage(input: UpdateDefaultDataStorageInput!): Boolean!`
- `completeOnboarding(input: CompleteOnboardingInput!): Boolean!`
- `completeSystemModelSettingOnboarding(input: CompleteSystemModelSettingOnboardingInput!): Boolean!`

来自 `model.graphql`：

- `createModel(input: CreateModelInput!): Model!`
- `bulkCreateModels(inputs: [CreateModelInput!]!): [Model!]!`
- `updateModel(id: ID!, input: UpdateModelInput!): Model!`
- `deleteModel(id: ID!): Boolean!`
- `updateModelStatus(id: ID!, status: ModelStatus!): Boolean!`
- `bulkArchiveModels(ids: [ID!]!): Boolean!`
- `bulkDisableModels(ids: [ID!]!): Boolean!`
- `bulkEnableModels(ids: [ID!]!): Boolean!`
- `bulkDeleteModels(ids: [ID!]!): Boolean!`

## 备注

- Schema 使用 Relay Connection 结构，分页参数统一为 `after/first/before/last`。
- 过滤与排序输入类型由 Ent 自动生成，详见 `axonhub/internal/server/gql/ent.graphql`。
