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
import { useCreateProject, useUpdateProject, useArchiveProject, useActivateProject } from '../data/projects';
import { createProjectInputSchema, updateProjectInputSchema } from '../data/schema';
import { useQuerySystemSetting } from '@/features/system-settings/data/settings';

// Create Project Dialog
export function CreateProjectDialog() {
  const { t } = useTranslation();
  const { isCreateDialogOpen, setIsCreateDialogOpen } = useProjectsContext();
  const createProject = useCreateProject();

  // Fetch user selectable groups from system settings
  const { data: selectableGroupsData } = useQuerySystemSetting('user_selectable_groups');

  // Get selectable groups or use default
  const selectableGroups = React.useMemo(() => {
    if (selectableGroupsData?.settings?.[0]?.value) {
      return selectableGroupsData.settings[0].value as Record<string, string>;
    }
    return { default: '默认分组' };
  }, [selectableGroupsData]);

  const form = useForm<z.infer<typeof createProjectInputSchema>>({
    resolver: zodResolver(createProjectInputSchema),
    defaultValues: {
      name: '',
      description: '',
      quota: 0,
      group: 'default',
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

            <FormField
              control={form.control}
              name='group'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('projects.dialogs.fields.group.label')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('projects.dialogs.fields.group.placeholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(selectableGroups).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>{t('projects.dialogs.fields.group.description')}</FormDescription>
                  <div className='min-h-[1.25rem]'>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='quota'
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{t('projects.dialogs.fields.quota.label')}</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      min={0}
                      placeholder={t('projects.dialogs.fields.quota.placeholder')}
                      aria-invalid={!!fieldState.error}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t('projects.dialogs.fields.quota.description')}</FormDescription>
                  <div className='min-h-[1.25rem]'>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

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

  // Fetch user selectable groups from system settings
  const { data: selectableGroupsData } = useQuerySystemSetting('user_selectable_groups');

  // Get selectable groups or use default
  const selectableGroups = React.useMemo(() => {
    if (selectableGroupsData?.settings?.[0]?.value) {
      return selectableGroupsData.settings[0].value as Record<string, string>;
    }
    return { default: '默认分组' };
  }, [selectableGroupsData]);

  const form = useForm<z.infer<typeof updateProjectInputSchema>>({
    resolver: zodResolver(updateProjectInputSchema),
    defaultValues: {
      name: '',
      description: '',
      quota: 0,
      usedQuota: 0,
      group: 'default',
    },
  });

  React.useEffect(() => {
    if (editingProject) {
      form.reset({
        name: editingProject.name,
        description: editingProject.description || '',
        quota: editingProject.quota ?? 0,
        usedQuota: editingProject.usedQuota ?? 0,
        group: editingProject.group ?? 'default',
      });
    }
  }, [editingProject, form]);

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

            <FormField
              control={form.control}
              name='group'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('projects.dialogs.fields.group.label')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('projects.dialogs.fields.group.placeholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(selectableGroups).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>{t('projects.dialogs.fields.group.description')}</FormDescription>
                  <div className='min-h-[1.25rem]'>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='quota'
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{t('projects.dialogs.fields.quota.label')}</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      min={0}
                      placeholder={t('projects.dialogs.fields.quota.placeholder')}
                      aria-invalid={!!fieldState.error}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t('projects.dialogs.fields.quota.description')}</FormDescription>
                  <div className='min-h-[1.25rem]'>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='usedQuota'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('projects.dialogs.fields.usedQuota.label')}</FormLabel>
                  <FormControl>
                    <Input type='number' min={0} readOnly disabled {...field} />
                  </FormControl>
                  <FormDescription>{t('projects.dialogs.fields.usedQuota.description')}</FormDescription>
                </FormItem>
              )}
            />

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

  const handleConfirm = async () => {
    if (!archivingProject) return;

    try {
      await archiveProject.mutateAsync(archivingProject.id);
      setArchivingProject(null);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <ConfirmDialog
      open={!!archivingProject}
      onOpenChange={() => setArchivingProject(null)}
      title={t('projects.dialogs.archive.title')}
      desc={t('projects.dialogs.archive.description', { name: archivingProject?.name })}
      confirmText={t('common.buttons.archive')}
      cancelBtnText={t('common.buttons.cancel')}
      handleConfirm={handleConfirm}
      isLoading={archiveProject.isPending}
      destructive
    />
  );
}

// Activate Project Dialog
export function ActivateProjectDialog() {
  const { t } = useTranslation();
  const { activatingProject, setActivatingProject } = useProjectsContext();
  const activateProject = useActivateProject();

  const handleConfirm = async () => {
    if (!activatingProject) return;

    try {
      await activateProject.mutateAsync(activatingProject.id);
      setActivatingProject(null);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <ConfirmDialog
      open={!!activatingProject}
      onOpenChange={() => setActivatingProject(null)}
      title={t('projects.dialogs.activate.title')}
      desc={t('projects.dialogs.activate.description', { name: activatingProject?.name })}
      confirmText={t('common.buttons.activate')}
      cancelBtnText={t('common.buttons.cancel')}
      handleConfirm={handleConfirm}
      isLoading={activateProject.isPending}
    />
  );
}

// Combined Dialogs Component
export function ProjectsDialogs() {
  return (
    <>
      <CreateProjectDialog />
      <EditProjectDialog />
      <ArchiveProjectDialog />
      <ActivateProjectDialog />
    </>
  );
}
