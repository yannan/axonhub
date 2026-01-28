'use client';

import { useTranslation } from 'react-i18next';
import { useState, useMemo, useCallback } from 'react';
import { RefreshCcw, CheckSquare, AlertTriangle, CheckCircle, Search, Info } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Types
interface UpstreamRatioSyncProps {
  options: {
    ModelPrice?: string;
    ModelRatio?: string;
    CompletionRatio?: string;
    CacheRatio?: string;
  };
  refresh?: () => void;
}

interface Channel {
  id: number;
  name: string;
  base_url: string;
}

interface ConflictItem {
  channel: string;
  model: string;
  current: string;
  newVal: string;
}

// Mock Data
const MOCK_CHANNELS: Channel[] = [
  { id: 1, name: 'OpenAI Official', base_url: 'https://api.openai.com' },
  { id: 2, name: 'Azure OpenAI', base_url: 'https://azure.openai.com' },
  { id: 3, name: 'Anthropic', base_url: 'https://api.anthropic.com' },
];

const MOCK_DIFFERENCES = {
  'gpt-4': {
    model_ratio: {
      current: 30,
      upstreams: { 'OpenAI Official': 30, 'Azure OpenAI': 60 },
      confidence: { 'OpenAI Official': true, 'Azure OpenAI': true },
    },
    completion_ratio: {
      current: 60,
      upstreams: { 'OpenAI Official': 60, 'Azure OpenAI': 120 },
      confidence: { 'OpenAI Official': true, 'Azure OpenAI': true },
    },
  },
  'gpt-3.5-turbo': {
    model_ratio: {
      current: 0.5,
      upstreams: { 'OpenAI Official': 0.5, 'Azure OpenAI': 0.5 },
      confidence: { 'OpenAI Official': true, 'Azure OpenAI': true },
    },
  },
  'claude-3-opus': {
    model_price: {
      current: null,
      upstreams: { 'Anthropic': 15 },
      confidence: { 'Anthropic': true },
    },
  },
};

export default function UpstreamRatioSync(props: UpstreamRatioSyncProps) {
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  
  // Channel Selection
  const [selectedChannelIds, setSelectedChannelIds] = useState<number[]>([]);

  // State
  const [differences, setDifferences] = useState<any>({});
  const [resolutions, setResolutions] = useState<any>({});
  const [hasSynced, setHasSynced] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filters
  const [searchKeyword, setSearchKeyword] = useState('');
  const [ratioTypeFilter, setRatioTypeFilter] = useState('');

  // Conflict Modal
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [conflictItems, setConflictItems] = useState<ConflictItem[]>([]);

  // Handlers
  const handleFetchChannels = async () => {
    setLoading(true);
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 500));
    setLoading(false);
    setModalVisible(true);
  };

  const handleSync = async () => {
    setSyncLoading(true);
    // Mock Sync
    await new Promise(resolve => setTimeout(resolve, 1000));
    setDifferences(MOCK_DIFFERENCES);
    setHasSynced(true);
    setSyncLoading(false);
    toast.success(t('ratioSetting.upstreamRatio.syncCompleteDiffFound'));
  };

  const handleApplySync = async () => {
    const conflicts: ConflictItem[] = [];
    // Mock conflict detection logic
    if (Object.keys(resolutions).length > 0) {
      // Just for demo
    }

    if (conflicts.length > 0) {
      setConflictItems(conflicts);
      setConfirmVisible(true);
    } else {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLoading(false);
      toast.success(t('ratioSetting.upstreamRatio.syncSuccess'));
      setResolutions({});
      if (props.refresh) props.refresh();
    }
  };

  const selectValue = (model: string, ratioType: string, value: any) => {
    setResolutions((prev: any) => {
      const newModelRes = { ...(prev[model] || {}) };
      // Logic to clear conflicting types (price vs ratio) would go here
      newModelRes[ratioType] = value;
      return { ...prev, [model]: newModelRes };
    });
  };

  // Helper for colors (simple hash)
  const stringToColor = (str: string) => {
    const colors = ['bg-blue-100 text-blue-800', 'bg-green-100 text-green-800', 'bg-yellow-100 text-yellow-800', 'bg-purple-100 text-purple-800'];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Render Logic
  const dataSource = useMemo(() => {
    const tmp: any[] = [];
    Object.entries(differences).forEach(([model, ratioTypes]: [string, any]) => {
      Object.entries(ratioTypes).forEach(([ratioType, diff]: [string, any]) => {
        tmp.push({
          key: `${model}_${ratioType}`,
          model,
          ratioType,
          current: diff.current,
          upstreams: diff.upstreams,
          confidence: diff.confidence || {},
        });
      });
    });
    return tmp;
  }, [differences]);

  const filteredDataSource = useMemo(() => {
    return dataSource.filter((item) => {
      const matchesKeyword = !searchKeyword.trim() || item.model.toLowerCase().includes(searchKeyword.toLowerCase().trim());
      const matchesRatioType = !ratioTypeFilter || item.ratioType === ratioTypeFilter;
      return matchesKeyword && matchesRatioType;
    });
  }, [dataSource, searchKeyword, ratioTypeFilter]);

  const upstreamNames = useMemo(() => {
    const set = new Set<string>();
    filteredDataSource.forEach((row) => {
      Object.keys(row.upstreams || {}).forEach((name) => set.add(name));
    });
    return Array.from(set);
  }, [filteredDataSource]);

  const pagedData = filteredDataSource.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className='space-y-4'>
      <div className='flex flex-col md:flex-row gap-4 justify-between items-start md:items-center'>
        <div className='flex flex-wrap gap-2'>
          <Button onClick={handleFetchChannels} variant='outline'>
            <RefreshCcw className='mr-2 h-4 w-4' />
            {t('ratioSetting.upstreamRatio.selectChannel')}
          </Button>
          <Button 
            onClick={handleApplySync} 
            disabled={Object.keys(resolutions).length === 0}
            variant='secondary'
          >
            <CheckSquare className='mr-2 h-4 w-4' />
            {t('ratioSetting.upstreamRatio.applySync')}
          </Button>
          {selectedChannelIds.length > 0 && !hasSynced && (
            <Button onClick={handleSync} disabled={syncLoading}>
              {syncLoading ? t('ratioSetting.upstreamRatio.syncing') : t('ratioSetting.upstreamRatio.startSync')}
            </Button>
          )}
        </div>
        
        <div className='flex flex-col sm:flex-row gap-2'>
          <div className='relative'>
            <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder={t('ratioSetting.searchModelName')}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className='pl-8 w-[200px]'
            />
          </div>
          <Select value={ratioTypeFilter} onValueChange={setRatioTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('ratioSetting.upstreamRatio.filterByRatioType')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="model_ratio">{t('ratioSetting.modelRatio')}</SelectItem>
              <SelectItem value="completion_ratio">{t('ratioSetting.completionRatio')}</SelectItem>
              <SelectItem value="cache_ratio">{t('ratioSetting.upstreamRatio.cacheRatio')}</SelectItem>
              <SelectItem value="model_price">{t('ratioSetting.fixedPrice')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[200px]'>{t('ratioSetting.upstreamRatio.model')}</TableHead>
              <TableHead>{t('ratioSetting.upstreamRatio.ratioType')}</TableHead>
              <TableHead>{t('ratioSetting.upstreamRatio.confidence')}</TableHead>
              <TableHead>{t('ratioSetting.upstreamRatio.currentValue')}</TableHead>
              {upstreamNames.map(name => (
                <TableHead key={name}>{name}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4 + upstreamNames.length} className='h-24 text-center'>
                  {hasSynced ? t('ratioSetting.upstreamRatio.noDiffFound') : t('ratioSetting.upstreamRatio.selectChannelFirst')}
                </TableCell>
              </TableRow>
            ) : (
              pagedData.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className='font-medium'>{row.model}</TableCell>
                  <TableCell>
                    <Badge variant='outline' className={stringToColor(row.ratioType)}>
                      {row.ratioType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant='outline' className='bg-green-50 text-green-700 border-green-200 gap-1'>
                            <CheckCircle className='h-3 w-3' />
                            {t('ratioSetting.upstreamRatio.trusted')}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('ratioSetting.upstreamRatio.allTrusted')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.current !== null ? 'default' : 'secondary'}>
                      {row.current !== null ? row.current : t('ratioSetting.upstreamRatio.notSet')}
                    </Badge>
                  </TableCell>
                  {upstreamNames.map(upName => {
                    const val = row.upstreams?.[upName];
                    const isSelected = resolutions[row.model]?.[row.ratioType] === val;
                    
                    if (val === undefined) return <TableCell key={upName}>-</TableCell>;
                    
                    return (
                      <TableCell key={upName}>
                        <div className='flex items-center gap-2'>
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              if (checked) selectValue(row.model, row.ratioType, val);
                              else {
                                setResolutions((prev: any) => {
                                  const newRes = { ...prev };
                                  if (newRes[row.model]) {
                                    delete newRes[row.model][row.ratioType];
                                    if (Object.keys(newRes[row.model]).length === 0) delete newRes[row.model];
                                  }
                                  return newRes;
                                });
                              }
                            }}
                          />
                          <span>{val}</span>
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Channel Selector Dialog */}
      <Dialog open={modalVisible} onOpenChange={setModalVisible}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t('ratioSetting.upstreamRatio.selectChannel')}</DialogTitle>
            <DialogDescription>{t('ratioSetting.upstreamRatio.selectChannelDesc')}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>{t('ratioSetting.upstreamRatio.channelName')}</TableHead>
                  <TableHead>{t('ratioSetting.upstreamRatio.baseUrl')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_CHANNELS.map(channel => (
                  <TableRow key={channel.id}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedChannelIds.includes(channel.id)}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedChannelIds(prev => [...prev, channel.id]);
                          else setSelectedChannelIds(prev => prev.filter(id => id !== channel.id));
                        }}
                      />
                    </TableCell>
                    <TableCell>{channel.name}</TableCell>
                    <TableCell className="font-mono text-xs">{channel.base_url}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalVisible(false)}>{t('ratioSetting.cancel')}</Button>
            <Button onClick={() => {
              setModalVisible(false);
              handleSync();
            }}>{t('ratioSetting.confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conflict Confirm Dialog */}
      <Dialog open={confirmVisible} onOpenChange={setConfirmVisible}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('ratioSetting.upstreamRatio.confirmConflict')}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {conflictItems.map((item, idx) => (
              <div key={idx} className="border p-4 rounded bg-muted/20">
                <div className="font-medium">{item.model}</div>
                <div className="text-sm text-muted-foreground">{t('ratioSetting.upstreamRatio.channel')}: {item.channel}</div>
                <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('ratioSetting.upstreamRatio.current')}:</span>
                    <div className="font-mono">{item.current}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('ratioSetting.upstreamRatio.changeTo')}:</span>
                    <div className="font-mono text-primary">{item.newVal}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmVisible(false)}>{t('ratioSetting.cancel')}</Button>
            <Button onClick={() => {
              setConfirmVisible(false);
              toast.success(t('ratioSetting.upstreamRatio.syncSuccess'));
              setResolutions({});
              if (props.refresh) props.refresh();
            }}>{t('ratioSetting.upstreamRatio.confirmSync')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
