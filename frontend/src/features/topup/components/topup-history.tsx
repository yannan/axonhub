import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TopupHistoryTable } from './topup-history-table';
import { createColumns } from './topup-history-columns';
import { useTopupHistory } from '../data/topup';

interface TopupHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
}

export function TopupHistory({ open, onOpenChange, projectId }: TopupHistoryProps) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading } = useTopupHistory({ page, pageSize, projectId });

  const columns = useMemo(() => createColumns(t), [t]);

  const handleNextPage = () => {
    if (data?.pageInfo?.hasNextPage) {
      setPage((p) => p + 1);
    }
  };

  const handlePreviousPage = () => {
    if (data?.pageInfo?.hasPreviousPage) {
      setPage((p) => Math.max(1, p - 1));
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('topup.history.title')}</DialogTitle>
          <DialogDescription>{t('topup.history.description')}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
          <TopupHistoryTable
            data={data?.edges?.map((edge) => edge.node) || []}
            columns={columns}
            loading={isLoading}
            pageInfo={data?.pageInfo}
            pageSize={pageSize}
            totalCount={data?.totalCount}
            onNextPage={handleNextPage}
            onPreviousPage={handlePreviousPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
