import { z } from 'zod';

export const topupHistoryItemSchema = z.object({
  id: z.string(),
  amount: z.number(),
  type: z.string(), // e.g., 'CODE', 'STRIPE'
  status: z.string(), // e.g., 'SUCCESS', 'PENDING'
  created_time: z.number(),
});

export type TopupHistoryItem = z.infer<typeof topupHistoryItemSchema>;

export const topupHistoryConnectionSchema = z.object({
  totalCount: z.number(),
  edges: z.array(
    z.object({
      node: topupHistoryItemSchema,
      cursor: z.string(),
    })
  ),
  pageInfo: z.object({
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    startCursor: z.string().nullable(),
    endCursor: z.string().nullable(),
  }),
});

export type TopupHistoryConnection = z.infer<typeof topupHistoryConnectionSchema>;

export const redeemCodeInputSchema = z.object({
  code: z.string().min(1, 'Code is required'),
});

export type RedeemCodeInput = z.infer<typeof redeemCodeInputSchema>;
