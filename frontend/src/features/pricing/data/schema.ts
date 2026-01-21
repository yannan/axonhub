import { z } from 'zod';

// Pricing type enum
export const pricingTypeSchema = z.enum(['quota', 'price']);
export type PricingType = z.infer<typeof pricingTypeSchema>;

export const pricingStatusSchema = z.enum(['enabled', 'disabled']);
export type PricingStatus = z.infer<typeof pricingStatusSchema>;

// Pricing interface
export interface Pricing {
    id: number;
    model: string;
    type: PricingType;
    status: PricingStatus;
    quota: number;
    price: number;
    completion_ratio: number;
    created_at: string;
    updated_at: string;
}

// Create pricing schema
export const createPricingSchema = z.object({
    model: z.string().min(1, 'Model name is required'),
    type: pricingTypeSchema.default('quota'),
    quota: z.number().min(0).default(0),
    price: z.number().min(0).default(0),
    completion_ratio: z.number().min(0).default(1.0),
});

export type CreatePricingInput = z.infer<typeof createPricingSchema>;

// Update pricing schema (model is required for identification but not editable in UI)
export const updatePricingSchema = z.object({
    model: z.string().min(1, 'Model name is required'),
    type: pricingTypeSchema.optional(),
    quota: z.number().min(0).optional(),
    price: z.number().min(0).optional(),
    completion_ratio: z.number().min(0).optional(),
});

export type UpdatePricingInput = z.infer<typeof updatePricingSchema>;

// API response schemas
export const pricingSchema = z.object({
    id: z.number(),
    model: z.string(),
    type: pricingTypeSchema,
    status: pricingStatusSchema,
    quota: z.number().nullable().default(0).transform(val => val ?? 0),
    price: z.number().nullable().default(0).transform(val => val ?? 0),
    completion_ratio: z.number().nullable().default(1.0).transform(val => val ?? 1.0),
    created_at: z.string(),
    updated_at: z.string(),
});

export const pricingListResponseSchema = z.object({
    success: z.boolean(),
    data: z.array(pricingSchema),
    pagination: z.object({
        total: z.number(),
        offset: z.number(),
        limit: z.number(),
    }),
});

export type PricingPagination = z.infer<typeof pricingListResponseSchema>['pagination'];

export const pricingResponseSchema = z.object({
    success: z.boolean(),
    data: pricingSchema,
});

export const deleteResponseSchema = z.object({
    success: z.boolean(),
});
