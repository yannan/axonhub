'use client';

import React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useProjectsContext } from '../context/projects-context';
import { useCreateProject, useUpdateProject, useArchiveProject, useActivateProject, useRedeemProject } from '../data/projects';
import { createProjectInputSchema, updateProjectInputSchema } from '../data/schema';
import { useQuery } from '@tanstack/react-query';
import { systemSettingsApi } from '@/lib/api-client';

// Hook to fetch user selectable groups
function useUserSelectableGroups() {
  return useQuery({
    queryKey: ['systemSettings', 'user_selectable_groups'],
    queryFn: async () => {
      const response = await systemSettingsApi.getSettings();
      const setting = response.settings.find((s) => s.key === 'user_selectable_groups');
      if (setting && setting.value && typeof setting.value === 'object') {
        // Handle both array and object formats
        if (Array.isArray(setting.value)) {
          return setting.value.map((v) => ({ label: v, value: v }));
        }
        // Handle object format: { "key": "Label" }
        return Object.entries(setting.value).map(([key, label]) => ({
          label: label as string,
          value: key,
        }));
      }
      return [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Create Project Dialog
export function CreateProjectDialog() {
  const { t } = useTranslation();
  const { isCreateDialogOpen, setIsCreateDialogOpen } = useProjectsContext();
  const createProject = useCreateProject();
  const { data: groups } = useUserSelectableGroups();

  const form = useForm<z.infer<typeof createProjectInputSchema>>({
    resolver: zodResolver(createProjectInputSchema),
    defaultValues: {
      name: '',
      description: '',
      group: undefined,
    },
  });

  const onSubmit = async (values: z.infer<typeof createProjectInputSchema>) => {
    try {
      await createProject.mutateAsync(values);
      setIsCreateDialogOpen(false);
      form.reset();
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleClose = () => {
    setIsCreateDialogOpen(false);
    form.reset();
  };

  return (
    <Dialog open={isCreateDialogOpen} onOpenChange={handleClose}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{t('projects.dialogs.create.title')}</DialogTitle>
          <DialogDescription>{t('projects.dialogs.create.description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            <FormField
              control={form.control}
              name='name'
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{t('projects.dialogs.fields.name.label')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('projects.dialogs.fields.name.placeholder')} aria-invalid={!!fieldState.error} {...field} />
                  </FormControl>
                  <FormDescription>{t('projects.dialogs.fields.name.description')}</FormDescription>
                  <div className='min-h-[1.25rem]'>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='description'
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{t('projects.dialogs.fields.description.label')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('projects.dialogs.fields.description.placeholder')}
                      aria-invalid={!!fieldState.error}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t('projects.dialogs.fields.description.description')}</FormDescription>
                  <div className='min-h-[1.25rem]'>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            {groups && groups.length > 0 && (
              <FormField
                control={form.control}
                name='group'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('projects.dialogs.fields.group.label') || 'Group'}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('projects.dialogs.fields.group.placeholder') || 'Select a group'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {groups.map((group) => (
                          <SelectItem key={group.value} value={group.value}>
                            {group.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>{t('projects.dialogs.fields.group.description') || 'Select the billing group for this project'}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type='button' variant='outline' onClick={handleClose}>
                {t('common.buttons.cancel')}
              </Button>
              <Button type='submit' disabled={createProject.isPending}>
                {createProject.isPending ? t('common.buttons.creating') : t('common.buttons.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Project Dialog
export function EditProjectDialog() {
  const { t } = useTranslation();
  const { editingProject, setEditingProject } = useProjectsContext();
  const updateProject = useUpdateProject();
  const { data: groups } = useUserSelectableGroups();

  const form = useForm<z.infer<typeof updateProjectInputSchema>>({
    resolver: zodResolver(updateProjectInputSchema),
    defaultValues: {
      name: '',
      description: '',
      group: undefined,
    },
  });

  React.useEffect(() => {
    if (editingProject) {
      form.reset({
        name: editingProject.name,
        description: editingProject.description || '',
        group: editingProject.group || undefined,
      });
    }
  }, [editingProject, form.reset]);

  const onSubmit = async (values: z.infer<typeof updateProjectInputSchema>) => {
    if (!editingProject) return;

    try {
      await updateProject.mutateAsync({ id: editingProject.id, input: values });
      setEditingProject(null);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleClose = () => {
    setEditingProject(null);
    form.reset();
  };

  if (!editingProject) return null;

  return (
    <Dialog open={!!editingProject} onOpenChange={handleClose}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{t('projects.dialogs.edit.title')}</DialogTitle>
          <DialogDescription>{t('projects.dialogs.edit.description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            <FormField
              control={form.control}
              name='name'
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{t('projects.dialogs.fields.name.label')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('projects.dialogs.fields.name.placeholder')} aria-invalid={!!fieldState.error} {...field} />
                  </FormControl>
                  <FormDescription>{t('projects.dialogs.fields.name.description')}</FormDescription>
                  <div className='min-h-[1.25rem]'>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='description'
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{t('projects.dialogs.fields.description.label')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('projects.dialogs.fields.description.placeholder')}
                      aria-invalid={!!fieldState.error}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t('projects.dialogs.fields.description.description')}</FormDescription>
                  <div className='min-h-[1.25rem]'>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            {groups && groups.length > 0 && (
              <FormField
                control={form.control}
                name='group'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('projects.dialogs.fields.group.label') || 'Group'}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('projects.dialogs.fields.group.placeholder') || 'Select a group'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {groups.map((group) => (
                          <SelectItem key={group.value} value={group.value}>
                            {group.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>{t('projects.dialogs.fields.group.description') || 'Select the billing group for this project'}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type='button' variant='outline' onClick={handleClose}>
                {t('common.buttons.cancel')}
              </Button>
              <Button type='submit' disabled={updateProject.isPending}>
                {updateProject.isPending ? t('common.buttons.saving') : t('common.buttons.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Archive Project Dialog
export function ArchiveProjectDialog() {
  const { t } = useTranslation();
  const { archivingProject, setArchivingProject } = useProjectsContext();
  const archiveProject = useArchiveProject();

  if (!archivingProject) return null;

  const handleConfirm = async () => {
    try {
      await archiveProject.mutateAsync(archivingProject.id);
      setArchivingProject(null);
    } catch (error) {}
  };

  return (
    <ConfirmDialog
      open={!!archivingProject}
      onOpenChange={(open) => !open && setArchivingProject(null)}
      title={t('projects.dialogs.archive.title')}
      desc={t('projects.dialogs.archive.description', { name: archivingProject.name })}
      confirmText={t('common.buttons.archive')}
      cancelBtnText={t('common.buttons.cancel')}
      destructive
      handleConfirm={handleConfirm}
      isLoading={archiveProject.isPending}
    />
  );
}

// Activate Project Dialog
export function ActivateProjectDialog() {
  const { t } = useTranslation();
  const { activatingProject, setActivatingProject } = useProjectsContext();
  const activateProject = useActivateProject();

  if (!activatingProject) return null;

  const handleConfirm = async () => {
    try {
      await activateProject.mutateAsync(activatingProject.id);
      setActivatingProject(null);
    } catch (error) {}
  };

  return (
    <ConfirmDialog
      open={!!activatingProject}
      onOpenChange={(open) => !open && setActivatingProject(null)}
      title={t('projects.dialogs.activate.title')}
      desc={t('projects.dialogs.activate.description', { name: activatingProject.name })}
      confirmText={t('common.buttons.activate')}
      cancelBtnText={t('common.buttons.cancel')}
      handleConfirm={handleConfirm}
      isLoading={activateProject.isPending}
    />
  );
}

// Redeem Project Dialog
export function RedeemProjectDialog() {
  const { t } = useTranslation();
  const { redeemingProject, setRedeemingProject } = useProjectsContext();
  const redeemProject = useRedeemProject();
  const [code, setCode] = React.useState('');

  if (!redeemingProject) return null;

  const handleClose = () => {
    setRedeemingProject(null);
    setCode('');
  };

  const handleConfirm = async () => {
    if (!code) return;
    try {
      await redeemProject.mutateAsync({ id: redeemingProject.id, code });
      handleClose();
    } catch (error) {}
  };

  return (
    <Dialog open={!!redeemingProject} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('topup.redeem.title')}</DialogTitle>
          <DialogDescription>
            {t('projects.dialogs.redeem.description', { defaultValue: 'Enter the redemption code for project {{name}}', name: redeemingProject.name })}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Input
              id="code"
              placeholder={t('topup.redeem.placeholder')}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('common.buttons.cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={!code || redeemProject.isPending}>
            {redeemProject.isPending ? t('common.processing') : t('topup.redeem.button')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ProjectsDialogs
export function ProjectsDialogs() {
  return (
    <>
      <CreateProjectDialog />
      <EditProjectDialog />
      <ArchiveProjectDialog />
      <ActivateProjectDialog />
      <RedeemProjectDialog />
    </>
  );
}
