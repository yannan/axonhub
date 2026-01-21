import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useApiKeysContext } from '../context/apikeys-context';
import { useUpdateApiKey } from '../data/apikeys';
import { UpdateApiKeyInput, updateApiKeyInputSchemaFactory } from '../data/schema';
import { ScopesSelect } from '@/components/scopes-select';

export function ApiKeysEditDialog() {
  const { t } = useTranslation();
  const { isDialogOpen, closeDialog, selectedApiKey } = useApiKeysContext();
  const updateApiKey = useUpdateApiKey();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [dialogContent, setDialogContent] = useState<HTMLDivElement | null>(null);

  const form = useForm<UpdateApiKeyInput>({
    resolver: zodResolver(updateApiKeyInputSchemaFactory(t)),
    defaultValues: {
      name: '',
      scopes: [],
      ipWhitelist: '',
      contentSafetyInterceptEnabled: true,
    },
  });

  useEffect(() => {
    if (selectedApiKey && isDialogOpen.edit) {
      form.reset({
        name: selectedApiKey.name,
        scopes: selectedApiKey.scopes || [],
        ipWhitelist: selectedApiKey.ipWhitelist ?? '',
        contentSafetyInterceptEnabled: selectedApiKey.contentSafetyInterceptEnabled ?? true,
      });
    }
  }, [selectedApiKey, isDialogOpen.edit, form]);

  const onSubmit = async (data: UpdateApiKeyInput) => {
    if (!selectedApiKey) return;

    setIsSubmitting(true);
    try {
      const input: UpdateApiKeyInput = {
        name: data.name,
        ipWhitelist: data.ipWhitelist?.trim(),
        contentSafetyInterceptEnabled: data.contentSafetyInterceptEnabled,
      };

      if (selectedApiKey.type === 'service_account') {
        input.scopes = data.scopes;
      }

      await updateApiKey.mutateAsync({
        id: selectedApiKey.id,
        input,
      });

      closeDialog('edit');
    } catch (error) {
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    closeDialog('edit');
  };

  const isServiceAccount = selectedApiKey?.type === 'service_account';

  return (
    <Dialog open={isDialogOpen.edit} onOpenChange={handleClose}>
      <DialogContent className='flex max-h-[90vh] flex-col sm:max-w-[600px]' ref={setDialogContent}>
        <DialogHeader>
          <DialogTitle>{t('apikeys.dialogs.edit.title')}</DialogTitle>
          <DialogDescription>{t('apikeys.dialogs.edit.description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('apikeys.dialogs.fields.name.label')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('apikeys.dialogs.fields.name.placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isServiceAccount && (
              <FormField
                control={form.control}
                name='scopes'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('apikeys.dialogs.fields.scopes.label')}</FormLabel>
                    <FormControl>
                      <ScopesSelect value={field.value || []} onChange={field.onChange} portalContainer={dialogContent} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name='ipWhitelist'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('apikeys.dialogs.fields.ipWhitelist.label')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('apikeys.dialogs.fields.ipWhitelist.placeholder')} rows={4} {...field} />
                  </FormControl>
                  <FormDescription>{t('apikeys.dialogs.fields.ipWhitelist.description')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='contentSafetyInterceptEnabled'
              render={({ field }) => (
                <FormItem className='flex items-center justify-between rounded-lg border p-3'>
                  <div className='space-y-1'>
                    <FormLabel>{t('apikeys.dialogs.fields.contentSafetyIntercept.label')}</FormLabel>
                    <FormDescription>{t('apikeys.dialogs.fields.contentSafetyIntercept.description')}</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className='space-y-4'>
              <div>
                <div className='flex items-center justify-between'>
                  <label className='text-muted-foreground text-sm font-medium'>{t('apikeys.dialogs.fields.key.label')}</label>
                  <Button type='button' variant='ghost' size='sm' onClick={() => setShowApiKey(!showApiKey)} className='h-6 px-2'>
                    {showApiKey ? <IconEyeOff className='h-3 w-3' /> : <IconEye className='h-3 w-3' />}
                    <span className='ml-1 text-xs'>{showApiKey ? t('apikeys.actions.hide') : t('apikeys.actions.show')}</span>
                  </Button>
                </div>
                <p className='text-foreground mt-1 font-mono text-sm break-all'>
                  {showApiKey ? selectedApiKey?.key : '••••••••••••••••••••••••••••••••'}
                </p>
              </div>
            </div>
            <DialogFooter className='flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end'>
              <div className='flex w-full gap-2 sm:w-auto'>
                <Button type='button' variant='outline' onClick={handleClose} disabled={isSubmitting}>
                  {t('common.buttons.cancel')}
                </Button>
                <Button type='submit' disabled={isSubmitting}>
                  {isSubmitting ? t('common.buttons.saving') : t('common.buttons.save')}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
