import { z } from 'zod';

export const subscriptionDataSchema = z.object({
  quota: z.coerce.number(),
  used_quota: z.coerce.number(),
});

export type SubscriptionData = {
  quota: number;
  usedQuota: number;
};

export const subscriptionResponseSchema = z.object({
  success: z.boolean(),
  data: subscriptionDataSchema,
});

export const rechargeRecordSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  project_id: z.number().optional(),
  code_id: z.number(),
  amount: z.coerce.number(),
  status: z.enum(['success', 'failed']),
  trace_id: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type RechargeRecord = z.infer<typeof rechargeRecordSchema>;

export const rechargeListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(rechargeRecordSchema),
});

export type RechargeList = z.infer<typeof rechargeListResponseSchema>;

export const redeemResponseSchema = z.object({
  status: z.string(),
  quota: z.number(),
});

export type RedeemResponse = z.infer<typeof redeemResponseSchema>;

export const dashboardStatsDataSchema = z.object({
  total_requests: z.coerce.number(),
  completed_requests: z.coerce.number(),
  failed_requests: z.coerce.number(),
  canceled_requests: z.coerce.number(),
  blocked_requests: z.coerce.number(),
  average_latency_ms: z.coerce.number().nullable().optional(),
  average_first_token_latency_ms: z.coerce.number().nullable().optional(),
  prompt_tokens: z.coerce.number(),
  completion_tokens: z.coerce.number(),
  total_tokens: z.coerce.number(),
});

export type DashboardStatsData = z.infer<typeof dashboardStatsDataSchema>;

export const dashboardStatsResponseSchema = z.object({
  success: z.boolean(),
  data: dashboardStatsDataSchema,
});

export const usageRecordSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  project_id: z.number(),
  model: z.string(),
  quota: z.coerce.number(),
  billing_multiplier: z.coerce.number(),
  group_multiplier: z.coerce.number(),
  model_multiplier: z.coerce.number(),
  completion_ratio: z.coerce.number(),
  trace_id: z.string().nullable().optional(),
  api_key_id: z.coerce.number().nullable().optional(),
  api_key_name: z.string().nullable().optional(),
  prompt_tokens: z.coerce.number(),
  completion_tokens: z.coerce.number(),
  total_tokens: z.coerce.number(),
  content: z.string().nullable().optional(),
  type: z.enum(['chat', 'image']),
  created_at: z.string(),
  updated_at: z.string(),
});

export type UsageRecord = z.infer<typeof usageRecordSchema>;

export const usageResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(usageRecordSchema),
});
