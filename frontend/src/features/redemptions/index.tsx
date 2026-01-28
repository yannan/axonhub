'use client';

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebounce } from '@/hooks/use-debounce';
import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';
import { createColumns } from './components/redemptions-columns';
import { RedemptionsTable } from './components/redemptions-table';
import { RedemptionsPrimaryButtons } from './components/redemptions-primary-buttons';
import { useRedemptions } from './data/redemptions';

function RedemptionsContent() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [filterValue, setFilterValue] = useState('');
  const debouncedFilterValue = useDebounce(filterValue, 300);

  const columns = useMemo(() => createColumns(t), [t]);

  const { data, isLoading } = useRedemptions({
    page,
    page_size: pageSize,
    keyword: debouncedFilterValue || undefined,
  });

  // Reset page when filter changes
  React.useEffect(() => {
    setPage(1);
  }, [debouncedFilterValue]);

  const handleNextPage = () => {
    setPage((p) => p + 1);
  };

  const handlePreviousPage = () => {
    setPage((p) => Math.max(1, p - 1));
  };

  const tableData = data?.data || [];
  // Assuming no total count is available from API, we can't display total pages correctly
  // unless we get it from headers or a wrapped response.
  // For now, we'll pass 0 as totalCount and handle it in the table or pagination component if needed.
  // Or we can check if tableData.length < pageSize to determine if there are more pages.

  return (
    <div className='flex flex-1 flex-col overflow-hidden'>
      <RedemptionsTable
        data={tableData}
        columns={columns}
        loading={isLoading}
        pageSize={pageSize}
        pageIndex={page}
        onNextPage={handleNextPage}
        onPreviousPage={handlePreviousPage}
        onPageSizeChange={setPageSize}
        filterValue={filterValue}
        onFilterChange={setFilterValue}
        hasMore={tableData.length === pageSize}
      />
    </div>
  );
}

export default function RedemptionsManagement() {
  const { t } = useTranslation();

  return (
    <>
      <Header fixed />
      <Main>
        <div className='mb-2 flex flex-wrap items-center justify-between space-y-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>{t('redemptions.title')}</h2>
            <p className='text-muted-foreground'>{t('redemptions.description')}</p>
          </div>
          <RedemptionsPrimaryButtons />
        </div>
        <div className='-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-y-0 lg:space-x-12'>
          <RedemptionsContent />
        </div>
      </Main>
    </>
  );
}
