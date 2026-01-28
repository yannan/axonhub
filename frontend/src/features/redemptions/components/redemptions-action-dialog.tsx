import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Redemption, createRedemptionInputSchema } from '../data/schema';
import { useDeleteRedemption, useCreateRedemption, useVoidRedemption } from '../data/redemptions';

interface RedemptionsActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redemption?: Redemption;
  mode: 'create' | 'delete' | 'void';
}

export function RedemptionsActionDialog({
  open,
  onOpenChange,
  redemption,
  mode,
}: RedemptionsActionDialogProps) {
  const { t } = useTranslation();
  const createMutation = useCreateRedemption();
  const deleteMutation = useDeleteRedemption();
  const voidMutation = useVoidRedemption();

  const isCreate = mode === 'create';
  const isDelete = mode === 'delete';
  const isVoid = mode === 'void';

  // For Create
  const formSchema = createRedemptionInputSchema;
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      count: 1,
      quota: 100000,
      max_uses: 1,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (isCreate) {
        await createMutation.mutateAsync(values);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const onDelete = async () => {
    if (redemption) {
      try {
        await deleteMutation.mutateAsync(redemption.id);
        onOpenChange(false);
      } catch (error) {
        // Error handled by mutation
      }
    }
  };

  const onVoid = async () => {
    if (redemption) {
      try {
        await voidMutation.mutateAsync(redemption.id);
        onOpenChange(false);
      } catch (error) {
        // Error handled by mutation
      }
    }
  };

  if (isDelete) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('redemptions.dialog.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('redemptions.dialog.deleteDescription', { name: redemption?.code })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => onOpenChange(false)}>
              {t('common.buttons.cancel')}
            </Button>
            <Button
              variant='destructive'
              onClick={onDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t('common.buttons.deleting') : t('common.buttons.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (isVoid) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('redemptions.dialog.voidTitle')}</DialogTitle>
            <DialogDescription>
              {t('redemptions.dialog.voidDescription', { name: redemption?.code })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => onOpenChange(false)}>
              {t('common.buttons.cancel')}
            </Button>
            <Button
              variant='destructive'
              onClick={onVoid}
              disabled={voidMutation.isPending}
            >
              {voidMutation.isPending ? t('common.buttons.voiding') : t('common.buttons.void')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('redemptions.dialog.createTitle')}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='count'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('redemptions.fields.count')}</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='quota'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('redemptions.fields.quota')}</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='max_uses'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('redemptions.fields.max_uses')}</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button variant='outline' type='button' onClick={() => onOpenChange(false)}>
                {t('common.buttons.cancel')}
              </Button>
              <Button
                type='submit'
                disabled={createMutation.isPending}
              >
                {createMutation.isPending
                  ? t('common.buttons.creating')
                  : t('common.buttons.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
