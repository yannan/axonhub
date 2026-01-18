'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCreatePricing, useUpdatePricing } from '../data/pricing';
import { createPricingSchema, updatePricingSchema, type Pricing, type CreatePricingInput, type UpdatePricingInput } from '../data/schema';

interface Props {
    currentRow?: Pricing;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function PricingActionDialog({ currentRow, open, onOpenChange }: Props) {
    const { t } = useTranslation();
    const isEdit = !!currentRow;
    const createPricing = useCreatePricing();
    const updatePricing = useUpdatePricing();

    const formSchema = isEdit ? updatePricingSchema : createPricingSchema;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: isEdit && currentRow
            ? {
                model: currentRow.model,
                type: currentRow.type,
                quota: currentRow.quota,
                price: currentRow.price,
                completion_ratio: currentRow.completion_ratio,
            }
            : {
                model: '',
                type: 'quota',
                quota: 0,
                price: 0,
                completion_ratio: 1.0,
            },
    });



    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            if (isEdit && currentRow) {
                await updatePricing.mutateAsync(values as UpdatePricingInput);
            } else {
                await createPricing.mutateAsync(values as CreatePricingInput);
            }

            form.reset();
            onOpenChange(false);
        } catch (_error) {
            // Error is handled by the mutation hooks
        }
    };



    return (
        <Dialog
            open={open}
            onOpenChange={(state) => {
                if (!state) {
                    form.reset();
                }
                onOpenChange(state);
            }}
        >
            <DialogContent className='max-h-[90vh] overflow-hidden sm:max-w-2xl'>
                <DialogHeader>
                    <DialogTitle>{isEdit ? t('pricing.dialogs.edit.title') : t('pricing.dialogs.create.title')}</DialogTitle>
                    <DialogDescription>
                        {isEdit ? t('pricing.dialogs.edit.description') : t('pricing.dialogs.create.description')}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className='max-h-[60vh] pr-4'>
                    <Form {...form}>
                        <form id='pricing-form' onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
                            {/* Model Name */}
                            <FormField
                                control={form.control}
                                name='model'
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('pricing.fields.model.label')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder={t('pricing.fields.model.placeholder')}
                                                disabled={isEdit}
                                            />
                                        </FormControl>
                                        <FormDescription>{t('pricing.fields.model.description')}</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Pricing Type */}
                            <FormField
                                control={form.control}
                                name='type'
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('pricing.fields.type.label')}</FormLabel>
                                        <FormControl>
                                            <RadioGroup
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                className='flex gap-4'
                                            >
                                                <div className='flex items-center space-x-2'>
                                                    <RadioGroupItem value='quota' id='type-quota' />
                                                    <label htmlFor='type-quota' className='cursor-pointer'>
                                                        {t('pricing.types.quota')}
                                                    </label>
                                                </div>
                                                <div className='flex items-center space-x-2'>
                                                    <RadioGroupItem value='price' id='type-price' />
                                                    <label htmlFor='type-price' className='cursor-pointer'>
                                                        {t('pricing.types.price')}
                                                    </label>
                                                </div>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormDescription>{t('pricing.fields.type.description')}</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Quota */}
                            <FormField
                                control={form.control}
                                name='quota'
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('pricing.fields.quota.label')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type='number'
                                                step='0.0001'
                                                placeholder='0.0000'
                                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                            />
                                        </FormControl>
                                        <FormDescription>{t('pricing.fields.quota.description')}</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Price */}
                            <FormField
                                control={form.control}
                                name='price'
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('pricing.fields.price.label')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type='number'
                                                step='0.0001'
                                                placeholder='0.0000'
                                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                            />
                                        </FormControl>
                                        <FormDescription>{t('pricing.fields.price.description')}</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Completion Ratio */}
                            <FormField
                                control={form.control}
                                name='completion_ratio'
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('pricing.fields.completionRatio.label')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type='number'
                                                step='0.01'
                                                placeholder='1.0'
                                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 1.0)}
                                            />
                                        </FormControl>
                                        <FormDescription>{t('pricing.fields.completionRatio.description')}</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </form>
                    </Form>
                </ScrollArea>

                <DialogFooter>
                    <Button variant='outline' onClick={() => onOpenChange(false)}>
                        {t('common.buttons.cancel')}
                    </Button>
                    <Button
                        type='submit'
                        form='pricing-form'
                        disabled={createPricing.isPending || updatePricing.isPending}
                    >
                        {isEdit ? t('common.buttons.save') : t('common.buttons.create')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
