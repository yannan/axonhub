'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import {
  type SensitiveWord,
  type SensitiveWordType,
  useAddSensitiveWord,
  useDeleteSensitiveWord,
  useSensitiveWords,
} from '../data/sensitive-words';

const formatTimestamp = (value?: string | null) => {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return format(date, 'yyyy-MM-dd HH:mm');
};

export function SensitiveWordsSettings() {
  const { t } = useTranslation();
  const [wordInput, setWordInput] = useState('');
  const [wordType, setWordType] = useState<SensitiveWordType>('block');
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<SensitiveWord | null>(null);

  const { data: words = [], isLoading } = useSensitiveWords();
  const addWord = useAddSensitiveWord();
  const deleteWord = useDeleteSensitiveWord();

  const filteredWords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return words;
    }
    return words.filter((item) => item.word.toLowerCase().includes(query));
  }, [search, words]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = wordInput.trim();
    if (!trimmed) {
      return;
    }

    try {
      await addWord.mutateAsync({
        word: trimmed,
        type: wordType,
      });
      setWordInput('');
    } catch {
      // Errors are surfaced via toasts.
    }
  };

  const typeLabels: Record<SensitiveWordType, string> = {
    block: t('system.sensitiveWords.types.block'),
    replace: t('system.sensitiveWords.types.replace'),
  };

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>{t('system.sensitiveWords.title')}</CardTitle>
          <CardDescription>{t('system.sensitiveWords.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className='grid gap-4 md:grid-cols-3'>
            <div className='space-y-2 md:col-span-2'>
              <Label htmlFor='sensitive-word-input'>{t('system.sensitiveWords.form.wordLabel')}</Label>
              <Input
                id='sensitive-word-input'
                value={wordInput}
                onChange={(event) => setWordInput(event.target.value)}
                placeholder={t('system.sensitiveWords.form.wordPlaceholder')}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='sensitive-word-type'>{t('system.sensitiveWords.form.typeLabel')}</Label>
              <Select value={wordType} onValueChange={(value) => setWordType(value as SensitiveWordType)}>
                <SelectTrigger id='sensitive-word-type'>
                  <SelectValue placeholder={t('system.sensitiveWords.form.typePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='block'>{t('system.sensitiveWords.types.block')}</SelectItem>
                  <SelectItem value='replace'>{t('system.sensitiveWords.types.replace')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='md:col-span-3 flex justify-end'>
              <Button type='submit' disabled={!wordInput.trim() || addWord.isPending}>
                {addWord.isPending ? t('common.buttons.creating') : t('system.sensitiveWords.form.add')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('system.sensitiveWords.table.title')}</CardTitle>
          <CardDescription>{t('system.sensitiveWords.table.description')}</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='max-w-sm'>
            <Label htmlFor='sensitive-word-search'>{t('system.sensitiveWords.filters.searchLabel')}</Label>
            <Input
              id='sensitive-word-search'
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('system.sensitiveWords.filters.searchPlaceholder')}
            />
          </div>

          <div className='border-border overflow-hidden rounded-lg border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('system.sensitiveWords.table.columns.word')}</TableHead>
                  <TableHead>{t('system.sensitiveWords.table.columns.type')}</TableHead>
                  <TableHead>{t('system.sensitiveWords.table.columns.createdAt')}</TableHead>
                  <TableHead className='text-right'>{t('system.sensitiveWords.table.columns.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeleton rows={6} columns={4} />
                ) : filteredWords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className='text-muted-foreground py-10 text-center text-sm'>
                      {t('system.sensitiveWords.table.empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWords.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className='font-medium'>{item.word}</TableCell>
                      <TableCell>
                        <Badge variant={item.type === 'block' ? 'destructive' : 'secondary'}>{typeLabels[item.type]}</Badge>
                      </TableCell>
                      <TableCell className='text-muted-foreground'>{formatTimestamp(item.created_at)}</TableCell>
                      <TableCell className='text-right'>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='text-destructive hover:text-destructive'
                          onClick={() => setDeleteTarget(item)}
                        >
                          <IconTrash className='mr-2 h-4 w-4' />
                          {t('common.buttons.delete')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title={t('system.sensitiveWords.dialogs.delete.title')}
        desc={t('system.sensitiveWords.dialogs.delete.description')}
        confirmText={deleteWord.isPending ? t('common.buttons.deleting') : t('common.buttons.delete')}
        cancelBtnText={t('common.buttons.cancel')}
        destructive
        isLoading={deleteWord.isPending}
        handleConfirm={() => {
          if (!deleteTarget) {
            return;
          }
          deleteWord.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
            onError: () => setDeleteTarget(null),
          });
        }}
      />
    </div>
  );
}
