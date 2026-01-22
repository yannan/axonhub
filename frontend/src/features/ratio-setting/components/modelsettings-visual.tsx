'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';
import { useState, useMemo, useEffect } from 'react';
import { Edit, Trash2, Plus, Save, Search, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/confirm-dialog';

import { pricingApi, PricingUpsertRequest } from '@/lib/api-client';

// Types
interface ModelData {
  name: string;
  price: string;
  ratio: string;
  completionRatio: string;
  hasConflict?: boolean;
  enabled?: boolean;
}

interface ModelSettingsVisualEditorProps {
  options?: {
    ModelPrice?: string;
    ModelRatio?: string;
    CompletionRatio?: string;
    ModelEnabled?: string;
  };
  refresh?: () => void;
}

// Form Schema
const createModelFormSchema = (t: any) => z.object({
  name: z.string().min(1, t('ratioSetting.enterModelName')),
  pricingMode: z.enum(['per-token', 'per-request']),
  pricingSubMode: z.enum(['ratio', 'token-price']),
  // Per-request fields
  priceInput: z.string().optional(),
  // Per-token fields (Ratio mode)
  ratioInput: z.string().optional(),
  completionRatioInput: z.string().optional(),
  // Per-token fields (Price mode)
  modelTokenPrice: z.string().optional(),
  completionTokenPrice: z.string().optional(),
});

type ModelFormValues = z.infer<ReturnType<typeof createModelFormSchema>>;

export default function ModelSettingsVisualEditor(props: ModelSettingsVisualEditorProps) {
  const { t } = useTranslation();
  const [models, setModels] = useState<ModelData[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [conflictOnly, setConflictOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Query to fetch pricing data
  const { data: pricingData, refetch: refetchPricing } = useQuery({
    queryKey: ['admin', 'pricing'],
    queryFn: () => pricingApi.getPricing(),
  });

  // Form for Dialog
  const modelFormSchema = useMemo(() => createModelFormSchema(t), [t]);
  
  const form = useForm<ModelFormValues>({
    resolver: zodResolver(modelFormSchema),
    defaultValues: {
      name: '',
      pricingMode: 'per-token',
      pricingSubMode: 'ratio',
      priceInput: '',
      ratioInput: '',
      completionRatioInput: '',
      modelTokenPrice: '',
      completionTokenPrice: '',
    },
  });

  // Watch values for conditional rendering and calculations
  const pricingMode = form.watch('pricingMode');
  const pricingSubMode = form.watch('pricingSubMode');
  const modelTokenPrice = form.watch('modelTokenPrice');

  // Initialize data from API response
  useEffect(() => {
    if (pricingData?.data) {
      const modelData: ModelData[] = pricingData.data.map((item) => {
        const price = item.type === 'connection' ? String(item.price) : '';
        const ratio = item.type === 'quota' ? String(item.quota) : '';
        const comp = item.type === 'quota' ? String(item.completion_ratio) : '';
        const enabled = item.status !== 'disabled';

        return {
          name: item.model,
          price,
          ratio,
          completionRatio: comp,
          hasConflict: false, // Conflicts are less likely with direct API mapping, but logic can be added if needed
          enabled,
        };
      });
      setModels(modelData);
    }
  }, [pricingData]);

  // Handle refresh
  useEffect(() => {
    if (props.refresh) {
      // If parent triggers refresh, we should also refetch our data
      // But props.refresh is a callback *we* call, not a signal to us usually.
      // If we want to support external refresh signal, we'd need another prop or context.
      // For now, assume this component manages its own data fetching.
    }
  }, [props.refresh]);

  // Override props.refresh to also refetch local data
  const handleRefresh = () => {
    refetchPricing();
    if (props.refresh) props.refresh();
  };

  // Filtering
  const filteredModels = useMemo(() => {
    return models.filter((model) => {
      const keywordMatch = searchText
        ? model.name.toLowerCase().includes(searchText.toLowerCase())
        : true;
      const conflictMatch = conflictOnly ? model.hasConflict : true;
      return keywordMatch && conflictMatch;
    });
  }, [models, searchText, conflictOnly]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredModels.length / pageSize);
  const pagedData = filteredModels.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // Handlers
  const handleEdit = (model: ModelData) => {
    setIsEditMode(true);
    let mode: 'per-token' | 'per-request' = 'per-token';
    let subMode: 'ratio' | 'token-price' = 'ratio';

    if (model.price !== '') {
      mode = 'per-request';
    }

    // Calculate token prices if needed
    let tokenPrice = '';
    let completionTokenPrice = '';

    if (model.ratio) {
      const ratioVal = parseFloat(model.ratio);
      if (!isNaN(ratioVal)) {
        tokenPrice = (ratioVal * 2).toString();
        if (model.completionRatio) {
          const compRatioVal = parseFloat(model.completionRatio);
          if (!isNaN(compRatioVal)) {
            completionTokenPrice = (parseFloat(tokenPrice) * compRatioVal).toString();
          }
        }
      }
    }

    form.reset({
      name: model.name,
      pricingMode: mode,
      pricingSubMode: subMode,
      priceInput: model.price,
      ratioInput: model.ratio,
      completionRatioInput: model.completionRatio,
      modelTokenPrice: tokenPrice,
      completionTokenPrice: completionTokenPrice,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (name: string) => {
    setModelToDelete(name);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!modelToDelete) return;
    
    try {
      await pricingApi.deleteModel(modelToDelete);
      setModels((prev) => prev.filter((m) => m.name !== modelToDelete));
      toast.success(t('ratioSetting.deleteSuccess'));
      if (props.refresh) props.refresh();
      refetchPricing();
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error(t('ratioSetting.deleteError'));
    } finally {
      setDeleteDialogOpen(false);
      setModelToDelete(null);
    }
  };

  const handleToggleEnable = async (model: ModelData) => {
    try {
      if (model.enabled) {
        await pricingApi.disableModel(model.name);
        toast.success(t('ratioSetting.disableSuccess', { name: model.name }));
      } else {
        await pricingApi.enableModel(model.name);
        toast.success(t('ratioSetting.enableSuccess', { name: model.name }));
      }
      
      setModels((prev) =>
        prev.map((m) =>
          m.name === model.name ? { ...m, enabled: !m.enabled } : m
        )
      );
      if (props.refresh) props.refresh();
    } catch (error) {
      console.error('Toggle failed:', error);
      toast.error(t('ratioSetting.toggleError'));
    }
  };

  const handleUpdateInline = (name: string, field: keyof ModelData, value: string) => {
    if (value !== '' && isNaN(Number(value))) {
      toast.error(t('ratioSetting.enterNumber'));
      return;
    }

    setModels((prev) =>
      prev.map((model) => {
        if (model.name !== name) return model;
        const updated = { ...model, [field]: value };
        updated.hasConflict =
          updated.price !== '' &&
          (updated.ratio !== '' || updated.completionRatio !== '');
        return updated;
      }),
    );
  };

  const onDialogSubmit = async (data: ModelFormValues) => {
    const newModel: ModelData = {
      name: data.name,
      price: '',
      ratio: '',
      completionRatio: '',
      enabled: true,
    };

    if (data.pricingMode === 'per-request') {
      newModel.price = data.priceInput || '';
    } else {
      if (data.pricingSubMode === 'ratio') {
        newModel.ratio = data.ratioInput || '';
        newModel.completionRatio = data.completionRatioInput || '';
      } else {
        // Calculate ratios from token prices
        const price = parseFloat(data.modelTokenPrice || '0');
        if (price > 0) {
          newModel.ratio = (price / 2).toString();
          const compPrice = parseFloat(data.completionTokenPrice || '0');
          if (compPrice > 0) {
            newModel.completionRatio = (compPrice / price).toString();
          }
        }
      }
    }

    newModel.hasConflict =
      newModel.price !== '' &&
      (newModel.ratio !== '' || newModel.completionRatio !== '');

    if (isEditMode) {
      try {
        const pricingRequest: PricingUpsertRequest = {
          model: newModel.name,
          type: newModel.price !== '' ? 'connection' : 'quota',
          quota: newModel.ratio ? parseFloat(newModel.ratio) : 0,
          price: newModel.price ? parseFloat(newModel.price) : 0,
          completion_ratio: newModel.completionRatio ? parseFloat(newModel.completionRatio) : 0,
        };

        await pricingApi.updatePricing(pricingRequest);

        setModels((prev) =>
          prev.map((m) => (m.name === newModel.name ? newModel : m)),
        );
        toast.success(t('ratioSetting.updateSuccess'));
        setIsDialogOpen(false);
        refetchPricing();
        if (props.refresh) props.refresh();
      } catch (error) {
        console.error('Update model failed:', error);
        toast.error(t('ratioSetting.updateError'));
      }
    } else {
      // Create logic using batchCreatePricing API
      if (models.some((m) => m.name === newModel.name)) {
        toast.error(t('ratioSetting.modelNameExists'));
        return;
      }

      try {
        const pricingRequest: PricingUpsertRequest = {
          model: newModel.name,
          type: newModel.price !== '' ? 'connection' : 'quota',
          quota: newModel.ratio ? parseFloat(newModel.ratio) : 0,
          price: newModel.price ? parseFloat(newModel.price) : 0,
          completion_ratio: newModel.completionRatio ? parseFloat(newModel.completionRatio) : 0,
        };

        await pricingApi.createPricing(pricingRequest);
        
        setModels((prev) => [newModel, ...prev]);
        toast.success(t('ratioSetting.addSuccess'));
        setIsDialogOpen(false);
        refetchPricing();
        if (props.refresh) props.refresh();
      } catch (error) {
        console.error('Create model failed:', error);
        toast.error(t('ratioSetting.createError'));
      }
    }
  };

  const handleSaveAll = async () => {
    setLoading(true);
    try {
      const items = models.map(model => ({
        model: model.name,
        type: model.price !== '' ? 'connection' : 'quota' as 'quota' | 'connection',
        quota: model.ratio ? parseFloat(model.ratio) : 0,
        price: model.price ? parseFloat(model.price) : 0,
        completion_ratio: model.completionRatio ? parseFloat(model.completionRatio) : 0,
      }));

      await pricingApi.batchCreatePricing({ items });
      toast.success(t('ratioSetting.saveAllSuccess'));
      refetchPricing();
      if (props.refresh) props.refresh();
    } catch (error) {
      console.error('Save all failed:', error);
      toast.error(t('ratioSetting.saveError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='space-y-4'>
      <div className='flex flex-col md:flex-row gap-4 items-start md:items-center justify-between'>
        <div className='flex gap-2'>
          <Button
            onClick={() => {
              setIsEditMode(false);
              form.reset({
                name: '',
                pricingMode: 'per-token',
                pricingSubMode: 'ratio',
                priceInput: '',
                ratioInput: '',
                completionRatioInput: '',
                modelTokenPrice: '',
                completionTokenPrice: '',
              });
              setIsDialogOpen(true);
            }}
          >
            <Plus className='mr-2 h-4 w-4' />
            {t('ratioSetting.modelRatioNotSet.addModel')}
          </Button>
          <Button variant='default' onClick={handleSaveAll} disabled={loading}>
            <Save className='mr-2 h-4 w-4' />
            {loading ? t('ratioSetting.saving') : t('ratioSetting.applyChanges')}
          </Button>
        </div>

        <div className='flex gap-2 items-center'>
          <div className='relative'>
            <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder={t('ratioSetting.searchModelName')}
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1);
              }}
              className='pl-8 w-[200px]'
            />
          </div>
          <div className='flex items-center space-x-2'>
            <Checkbox
              id='conflictOnly'
              checked={conflictOnly}
              onCheckedChange={(checked) => {
                setConflictOnly(checked as boolean);
                setCurrentPage(1);
              }}
            />
            <label
              htmlFor='conflictOnly'
              className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
            >
              {t('ratioSetting.visualEditor.showConflictOnly')}
            </label>
          </div>
        </div>
      </div>

      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('ratioSetting.modelName')}</TableHead>
              <TableHead>{t('ratioSetting.modelRatioSettings.modelFixedPrice')}</TableHead>
              <TableHead>{t('ratioSetting.modelRatio')}</TableHead>
              <TableHead>{t('ratioSetting.completionRatio')}</TableHead>
              <TableHead>{t('ratioSetting.status')}</TableHead>
              <TableHead className='w-[100px]'>{t('ratioSetting.action')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className='h-24 text-center'>
                  {t('ratioSetting.noData')}
                </TableCell>
              </TableRow>
            ) : (
              pagedData.map((model) => (
                <TableRow key={model.name}>
                  <TableCell className='font-medium'>
                    <div className='flex items-center gap-2'>
                      {model.name}
                      {model.hasConflict && (
                        <Badge variant='destructive' className='rounded-full px-1'>
                          {t('ratioSetting.visualEditor.conflict')}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={model.price}
                      placeholder={t('ratioSetting.payPerUsage')}
                      onChange={(e) =>
                        handleUpdateInline(model.name, 'price', e.target.value)
                      }
                      className='h-8 w-[120px]'
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={model.ratio}
                      placeholder={model.price !== '' ? t('ratioSetting.modelRatio') : t('ratioSetting.visualEditor.defaultCompletionRatio')}
                      disabled={model.price !== ''}
                      onChange={(e) =>
                        handleUpdateInline(model.name, 'ratio', e.target.value)
                      }
                      className='h-8 w-[120px]'
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={model.completionRatio}
                      placeholder={model.price !== '' ? t('ratioSetting.completionRatio') : t('ratioSetting.visualEditor.defaultCompletionRatio')}
                      disabled={model.price !== ''}
                      onChange={(e) =>
                        handleUpdateInline(model.name, 'completionRatio', e.target.value)
                      }
                      className='h-8 w-[120px]'
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={model.enabled !== false}
                      onCheckedChange={() => handleToggleEnable(model)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className='flex items-center gap-2'>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => handleEdit(model)}
                      >
                        <Edit className='h-4 w-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='text-destructive'
                        onClick={() => handleDeleteClick(model.name)}
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className='flex justify-end gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            {t('ratioSetting.prevPage')}
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            {t('ratioSetting.nextPage')}
          </Button>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className='sm:max-w-[500px]'>
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? t('ratioSetting.visualEditor.editModel') : t('ratioSetting.modelRatioNotSet.addModel')}
            </DialogTitle>
            <DialogDescription>
              {t('ratioSetting.visualEditor.configurePricing')}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onDialogSubmit)} className='space-y-4'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('ratioSetting.modelName')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='例如: gpt-4'
                        disabled={isEditMode}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='pricingMode'
                render={({ field }) => (
                  <FormItem className='space-y-3'>
                    <FormLabel>{t('ratioSetting.pricingMode')}</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className='flex flex-col space-y-1'
                      >
                        <FormItem className='flex items-center space-x-3 space-y-0'>
                          <FormControl>
                            <RadioGroupItem value='per-token' />
                          </FormControl>
                          <FormLabel className='font-normal'>
                            {t('ratioSetting.payPerUsage')}
                          </FormLabel>
                        </FormItem>
                        <FormItem className='flex items-center space-x-3 space-y-0'>
                          <FormControl>
                            <RadioGroupItem value='per-request' />
                          </FormControl>
                          <FormLabel className='font-normal'>
                            {t('ratioSetting.payPerRequest')}
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {pricingMode === 'per-token' && (
                <div className='space-y-4 rounded-lg border p-4 bg-muted/50'>
                  <FormField
                    control={form.control}
                    name='pricingSubMode'
                    render={({ field }) => (
                      <FormItem className='space-y-3'>
                        <FormLabel>{t('ratioSetting.visualEditor.priceSettingMode')}</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className='flex flex-row space-x-4'
                          >
                            <FormItem className='flex items-center space-x-2 space-y-0'>
                              <FormControl>
                                <RadioGroupItem value='ratio' />
                              </FormControl>
                              <FormLabel className='font-normal'>
                                {t('ratioSetting.visualEditor.setByRatio')}
                              </FormLabel>
                            </FormItem>
                            <FormItem className='flex items-center space-x-2 space-y-0'>
                              <FormControl>
                                <RadioGroupItem value='token-price' disabled />
                              </FormControl>
                              <FormLabel className='font-normal text-muted-foreground'>
                                {t('ratioSetting.visualEditor.setByPrice')} (Coming Soon)
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {pricingSubMode === 'ratio' ? (
                    <>
                      <FormField
                        control={form.control}
                        name='ratioInput'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('ratioSetting.modelRatio')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('ratioSetting.enterModelRatio')} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name='completionRatioInput'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('ratioSetting.completionRatio')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('ratioSetting.enterCompletionRatio')} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  ) : (
                    <>
                      <FormField
                        control={form.control}
                        name='modelTokenPrice'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('ratioSetting.visualEditor.enterPricePer1M')}</FormLabel>
                            <FormControl>
                              <Input placeholder='0.00' {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name='completionTokenPrice'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('ratioSetting.visualEditor.enterCompletionPricePer1M')}</FormLabel>
                            <FormControl>
                              <Input placeholder='0.00' {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>
              )}

              {pricingMode === 'per-request' && (
                <FormField
                  control={form.control}
                  name='priceInput'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('ratioSetting.fixedPricePerRequest')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('ratioSetting.enterPricePerRequest')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button type='button' variant='outline' onClick={() => setIsDialogOpen(false)}>
                  {t('ratioSetting.cancel')}
                </Button>
                <Button type='submit'>{t('ratioSetting.confirm')}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('ratioSetting.confirmDelete')}
        desc={t('ratioSetting.deleteDescription', { name: modelToDelete })}
        confirmText={t('ratioSetting.confirm')}
        cancelBtnText={t('ratioSetting.cancel')}
        destructive
        handleConfirm={handleConfirmDelete}
      />
    </div>
  );
}