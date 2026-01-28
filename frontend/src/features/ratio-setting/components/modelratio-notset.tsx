'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { z } from 'zod';
import { useState, useEffect, useMemo } from 'react';
import { Plus, Save, Search, Zap } from 'lucide-react';
import { useQueryModels } from '@/features/models/data/models';

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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';


//- 全集 (Universal Set) : 使用 useQueryModels 获取系统中所有已添加的模型 ( modelID )。
//- 已配置集 (Configured Set) : 从 props.options 中获取已配置了价格 ( ModelPrice ) 或倍率 ( ModelRatio ) 的模型。
//- 差集 (Difference Set) : 全集 排除掉 已配置集 中的模型，即为“未设置模型”。
// Types
interface ModelData {
  name: string;
  price: string;
  ratio: string;
  completionRatio: string;
}

interface ModelRatioNotSetEditorProps {
  options: {
    ModelPrice?: string;
    ModelRatio?: string;
    CompletionRatio?: string;
  };
  refresh?: () => void;
}

// Form Schemas
// Note: validation messages also need to be translated, but z.object runs before component render
// ideally we should use z.string({ required_error: t(...) }) inside component or use a function to get schema
// For now, we will leave the hardcoded strings in schema or move schema creation inside component
// Moving schema inside component is better for i18n
const createAddModelSchema = (t: any) => z.object({
  name: z.string().min(1, t('ratioSetting.enterModelName')),
  priceMode: z.boolean().default(false),
  price: z.string().optional(),
  ratio: z.string().optional(),
  completionRatio: z.string().optional(),
});

type AddModelFormValues = z.infer<ReturnType<typeof createAddModelSchema>>;

const batchFillSchema = z.object({
  fillType: z.enum(['price', 'ratio', 'completionRatio', 'bothRatio']),
  value: z.string().optional(),
  ratioValue: z.string().optional(),
  completionRatioValue: z.string().optional(),
});

type BatchFillFormValues = z.infer<typeof batchFillSchema>;

export default function ModelRatioNotSetEditor(props: ModelRatioNotSetEditorProps) {
  const { t } = useTranslation();
  const [models, setModels] = useState<ModelData[]>([]);
  
  // Fetch models
  const { data: modelsData } = useQueryModels({
    first: 1000,
    orderBy: { field: 'MODEL_ID', direction: 'ASC' },
  });

  const enabledModels = useMemo(() => {
    return modelsData?.edges?.map((edge) => edge.node.modelID) || [];
  }, [modelsData]);

  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Forms
  const addModelSchema = useMemo(() => createAddModelSchema(t), [t]);
  
  const addForm = useForm<AddModelFormValues>({
    resolver: zodResolver(addModelSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      priceMode: false,
      price: '',
      ratio: '',
      completionRatio: '',
    },
  });

  const batchForm = useForm<BatchFillFormValues>({
    resolver: zodResolver(batchFillSchema),
    mode: 'onChange',
    defaultValues: {
      fillType: 'ratio',
      value: '',
      ratioValue: '',
      completionRatioValue: '',
    },
  });

  // Watch for add form conditional rendering
  const priceMode = addForm.watch('priceMode');
  // Watch for batch form conditional rendering
  const fillType = batchForm.watch('fillType');

  // Initialize data from props and enabled models
  useEffect(() => {
    try {
      const modelPrice = JSON.parse(props.options.ModelPrice || '{}');
      const modelRatio = JSON.parse(props.options.ModelRatio || '{}');
      const completionRatio = JSON.parse(props.options.CompletionRatio || '{}');

      // Filter for unset models
      const unsetModels = enabledModels.filter((modelName) => {
        const hasPrice = modelPrice[modelName] !== undefined;
        const hasRatio = modelRatio[modelName] !== undefined;
        return !hasPrice && !hasRatio;
      });

      const modelData: ModelData[] = unsetModels.map((name) => ({
        name,
        price: '',
        ratio: '',
        completionRatio: '',
      }));

      setModels(modelData);
      setSelectedRowKeys([]);
    } catch (error) {
      console.error('JSON Parse Error:', error);
      toast.error(t('ratioSetting.dataParseError'));
    }
  }, [props.options, enabledModels, t]);

  // Filtering
  const filteredModels = useMemo(() => {
    return models.filter((model) =>
      searchText ? model.name.toLowerCase().includes(searchText.toLowerCase()) : true
    );
  }, [models, searchText]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredModels.length / pageSize);
  const pagedData = filteredModels.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // Handlers
  const handleUpdateInline = (name: string, field: keyof ModelData, value: string) => {
    if (value !== '' && isNaN(Number(value))) {
      toast.error(t('ratioSetting.enterNumber'));
      return;
    }

    setModels((prev) =>
      prev.map((model) =>
        model.name === name ? { ...model, [field]: value } : model,
      ),
    );
  };

  const onAddSubmit = (data: AddModelFormValues) => {
    if (models.some((m) => m.name === data.name)) {
      toast.error(t('ratioSetting.modelNameExists'));
      return;
    }

    const newModel: ModelData = {
      name: data.name,
      price: data.priceMode ? data.price || '' : '',
      ratio: !data.priceMode ? data.ratio || '' : '',
      completionRatio: !data.priceMode ? data.completionRatio || '' : '',
    };

    setModels((prev) => [newModel, ...prev]);
    toast.success(t('ratioSetting.addSuccess'));
    setIsAddDialogOpen(false);
    addForm.reset();
  };

  const onBatchSubmit = (data: BatchFillFormValues) => {
    if (selectedRowKeys.length === 0) {
      toast.error(t('ratioSetting.modelRatioNotSet.selectModelBatch'));
      return;
    }

    setModels((prev) =>
      prev.map((model) => {
        if (selectedRowKeys.includes(model.name)) {
          if (data.fillType === 'price') {
            return {
              ...model,
              price: data.value || '',
              ratio: '',
              completionRatio: '',
            };
          } else if (data.fillType === 'ratio') {
            return {
              ...model,
              price: '',
              ratio: data.value || '',
            };
          } else if (data.fillType === 'completionRatio') {
            return {
              ...model,
              price: '',
              completionRatio: data.value || '',
            };
          } else if (data.fillType === 'bothRatio') {
            return {
              ...model,
              price: '',
              ratio: data.ratioValue || '',
              completionRatio: data.completionRatioValue || '',
            };
          }
        }
        return model;
      }),
    );

    setIsBatchDialogOpen(false);
    toast.success(t('ratioSetting.modelRatioNotSet.batchSetSuccess'));
    batchForm.reset();
  };

  const handleSaveAll = async () => {
    setLoading(true);
    // Simulation
    console.log('Saving models:', models);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLoading(false);
    toast.success(t('ratioSetting.saveSuccess'));
    if (props.refresh) props.refresh();
  };

  // Row Selection Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRowKeys(pagedData.map((m) => m.name));
    } else {
      setSelectedRowKeys([]);
    }
  };

  const handleSelectRow = (name: string, checked: boolean) => {
    if (checked) {
      setSelectedRowKeys((prev) => [...prev, name]);
    } else {
      setSelectedRowKeys((prev) => prev.filter((k) => k !== name));
    }
  };

  return (
    <div className='space-y-4'>
      <div className='flex flex-col md:flex-row gap-4 items-start md:items-center justify-between'>
        <div className='flex gap-2'>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className='mr-2 h-4 w-4' />
            {t('ratioSetting.modelRatioNotSet.addModel')}
          </Button>
          <Button
            variant='secondary'
            onClick={() => setIsBatchDialogOpen(true)}
            disabled={selectedRowKeys.length === 0}
          >
            <Zap className='mr-2 h-4 w-4' />
            {t('ratioSetting.modelRatioNotSet.batchSet')} ({selectedRowKeys.length})
          </Button>
          <Button variant='default' onClick={handleSaveAll} disabled={loading}>
            <Save className='mr-2 h-4 w-4' />
            {loading ? t('ratioSetting.saving') : t('ratioSetting.applyChanges')}
          </Button>
        </div>

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
      </div>

      <div className='text-sm text-muted-foreground'>
        {t('ratioSetting.modelRatioNotSet.description')}
      </div>

      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[50px]'>
                <Checkbox
                  checked={
                    pagedData.length > 0 &&
                    pagedData.every((m) => selectedRowKeys.includes(m.name))
                  }
                  onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                />
              </TableHead>
              <TableHead>{t('ratioSetting.modelName')}</TableHead>
              <TableHead>{t('ratioSetting.modelRatioSettings.modelFixedPrice')}</TableHead>
              <TableHead>{t('ratioSetting.modelRatio')}</TableHead>
              <TableHead>{t('ratioSetting.completionRatio')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className='h-24 text-center'>
                  {t('ratioSetting.modelRatioNotSet.noUnsetModels')}
                </TableCell>
              </TableRow>
            ) : (
              pagedData.map((model) => (
                <TableRow key={model.name}>
                  <TableCell>
                    <Checkbox
                      checked={selectedRowKeys.includes(model.name)}
                      onCheckedChange={(checked) =>
                        handleSelectRow(model.name, checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell className='font-medium'>{model.name}</TableCell>
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
                      placeholder={model.price !== '' ? t('ratioSetting.modelRatio') : t('ratioSetting.enterModelRatio')}
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
                      placeholder={model.price !== '' ? t('ratioSetting.completionRatio') : t('ratioSetting.enterCompletionRatio')}
                      disabled={model.price !== ''}
                      onChange={(e) =>
                        handleUpdateInline(model.name, 'completionRatio', e.target.value)
                      }
                      className='h-8 w-[120px]'
                    />
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

      {/* Add Model Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('ratioSetting.modelRatioNotSet.addModel')}</DialogTitle>
            <DialogDescription>
              {t('ratioSetting.modelRatioNotSet.addModelDesc')}
            </DialogDescription>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(onAddSubmit)} className='space-y-4'>
              <FormField
                control={addForm.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('ratioSetting.modelName')}</FormLabel>
                    <FormControl>
                      <Input placeholder='例如: strawberry' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={addForm.control}
                name='priceMode'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                    <div className='space-y-0.5'>
                      <FormLabel className='text-base'>
                        {t('ratioSetting.pricingMode')}
                      </FormLabel>
                      <FormDescription>
                        {field.value ? t('ratioSetting.fixedPrice') : t('ratioSetting.modelRatioNotSet.ratioMode')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {priceMode ? (
                <FormField
                  control={addForm.control}
                  name='price'
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
              ) : (
                <>
                  <FormField
                    control={addForm.control}
                    name='ratio'
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
                    control={addForm.control}
                    name='completionRatio'
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
              )}

              <DialogFooter>
                <Button type='button' variant='outline' onClick={() => setIsAddDialogOpen(false)}>
                  {t('ratioSetting.cancel')}
                </Button>
                <Button type='submit'>{t('ratioSetting.confirm')}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Batch Fill Dialog */}
      <Dialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen}>
        <DialogContent className='sm:max-w-[500px]'>
          <DialogHeader>
            <DialogTitle>{t('ratioSetting.modelRatioNotSet.batchSetTitle')}</DialogTitle>
            <DialogDescription>
              {t('ratioSetting.modelRatioNotSet.batchSetDesc', { count: selectedRowKeys.length })}
            </DialogDescription>
          </DialogHeader>

          <Form {...batchForm}>
            <form onSubmit={batchForm.handleSubmit(onBatchSubmit)} className='space-y-4'>
              <FormField
                control={batchForm.control}
                name='fillType'
                render={({ field }) => (
                  <FormItem className='space-y-3'>
                    <FormLabel>{t('ratioSetting.modelRatioNotSet.setType')}</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className='flex flex-col space-y-1'
                      >
                        <FormItem className='flex items-center space-x-3 space-y-0'>
                          <FormControl>
                            <RadioGroupItem value='price' />
                          </FormControl>
                          <FormLabel className='font-normal'>
                            {t('ratioSetting.fixedPrice')}
                          </FormLabel>
                        </FormItem>
                        <FormItem className='flex items-center space-x-3 space-y-0'>
                          <FormControl>
                            <RadioGroupItem value='ratio' />
                          </FormControl>
                          <FormLabel className='font-normal'>
                            {t('ratioSetting.modelRatio')}
                          </FormLabel>
                        </FormItem>
                        <FormItem className='flex items-center space-x-3 space-y-0'>
                          <FormControl>
                            <RadioGroupItem value='completionRatio' />
                          </FormControl>
                          <FormLabel className='font-normal'>
                            {t('ratioSetting.completionRatio')}
                          </FormLabel>
                        </FormItem>
                        <FormItem className='flex items-center space-x-3 space-y-0'>
                          <FormControl>
                            <RadioGroupItem value='bothRatio' />
                          </FormControl>
                          <FormLabel className='font-normal'>
                            {t('ratioSetting.modelRatioNotSet.setBothRatio')}
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {fillType === 'bothRatio' ? (
                <>
                  <FormField
                    control={batchForm.control}
                    name='ratioValue'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('ratioSetting.modelRatioNotSet.modelRatioValue')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('ratioSetting.enterModelRatio')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={batchForm.control}
                    name='completionRatioValue'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('ratioSetting.modelRatioNotSet.completionRatioValue')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('ratioSetting.enterCompletionRatio')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : (
                <FormField
                  control={batchForm.control}
                  name='value'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {fillType === 'price'
                          ? t('ratioSetting.modelRatioNotSet.fixedPriceValue')
                          : fillType === 'ratio'
                            ? t('ratioSetting.modelRatioNotSet.modelRatioValue')
                            : t('ratioSetting.modelRatioNotSet.completionRatioValue')}
                      </FormLabel>
                      <FormControl>
                        <Input placeholder={t('ratioSetting.modelRatioNotSet.enterValue')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button type='button' variant='outline' onClick={() => setIsBatchDialogOpen(false)}>
                  {t('ratioSetting.cancel')}
                </Button>
                <Button type='submit'>{t('ratioSetting.confirm')}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
