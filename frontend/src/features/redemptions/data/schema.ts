import { z } from 'zod';

export const redemptionStatusSchema = z.enum(['active', 'used', 'disabled']);

export const redemptionSchema = z.object({
  id: z.number(),
  code: z.string(),
  quota: z.number(),
  status: redemptionStatusSchema,
  expires_at: z.string().nullable(),
  max_uses: z.number(),
  used_times: z.number().optional().default(0),
  voided: z.boolean().optional().default(false),
  used_by: z.number().nullable().optional(),
  used_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.number().optional().default(0),
});

export type Redemption = z.infer<typeof redemptionSchema>;

export const redemptionListSchema = z.object({
  success: z.boolean().optional().default(true),
  data: z.array(redemptionSchema),
});

export type RedemptionList = z.infer<typeof redemptionListSchema>;

export const createRedemptionInputSchema = z.object({
  count: z.number().min(1).default(1),
  quota: z.number().min(1, 'Quota must be greater than 0'),
  max_uses: z.number().optional(),
  expires_at: z.string().optional(),
});

export type CreateRedemptionInput = z.infer<typeof createRedemptionInputSchema>;

// Update is not supported in the new API, only void/delete.
// Keeping it for now but might remove or repurpose.
export const updateRedemptionInputSchema = z.object({
  quota: z.number().optional(),
});

export type UpdateRedemptionInput = z.infer<typeof updateRedemptionInputSchema>;
