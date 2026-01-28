import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, Box, Zap, Coins } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';

// Mock Data
const MOCK_MODELS = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    type: 'Chat',
    description: 'OpenAI\'s most advanced multimodal model.',
    inputPrice: 5.0,
    outputPrice: 15.0,
    tags: ['Multimodal', 'Complex Tasks'],
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    type: 'Chat',
    description: 'Cost-efficient small model for simple tasks.',
    inputPrice: 0.15,
    outputPrice: 0.6,
    tags: ['Fast', 'Cheap'],
  },
  {
    id: 'claude-3-5-sonnet-20240620',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    type: 'Chat',
    description: 'Anthropic\'s most intelligent model.',
    inputPrice: 3.0,
    outputPrice: 15.0,
    tags: ['Reasoning', 'Coding'],
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    provider: 'Anthropic',
    type: 'Chat',
    description: 'Fastest and most compact model for near-instant responsiveness.',
    inputPrice: 0.25,
    outputPrice: 1.25,
    tags: ['Fast', 'Cheap'],
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'Google',
    type: 'Chat',
    description: 'Google\'s best model for scaling across a wide range of tasks.',
    inputPrice: 3.5,
    outputPrice: 10.5,
    tags: ['Long Context', 'Reasoning'],
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'Google',
    type: 'Chat',
    description: 'Fast and versatile model for scaling.',
    inputPrice: 0.35,
    outputPrice: 1.05,
    tags: ['Fast', 'Long Context'],
  },
  {
    id: 'text-videos-3-large',
    name: 'Text videos 3 Large',
    provider: 'OpenAI',
    type: 'videos',
    description: 'Most capable videos model for both english and non-english tasks.',
    inputPrice: 0.13,
    outputPrice: 0,
    tags: ['videos'],
  },
  {
    id: 'dall-e-3',
    name: 'DALL·E 3',
    provider: 'OpenAI',
    type: 'Image',
    description: 'Create realistic images and art from a description in natural language.',
    inputPrice: 40,
    outputPrice: 0,
    unit: 'image',
    tags: ['Image Generation'],
  },
];

const PROVIDERS = Array.from(new Set(MOCK_MODELS.map((m) => m.provider)));
const TYPES = Array.from(new Set(MOCK_MODELS.map((m) => m.type)));

export function ModelsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const filteredModels = useMemo(() => {
    return MOCK_MODELS.filter((model) => {
      const matchesSearch =
        model.name.toLowerCase().includes(search.toLowerCase()) ||
        model.id.toLowerCase().includes(search.toLowerCase());
      const matchesProvider =
        selectedProviders.length === 0 ||
        selectedProviders.includes(model.provider);
      const matchesType =
        selectedTypes.length === 0 || selectedTypes.includes(model.type);

      return matchesSearch && matchesProvider && matchesType;
    });
  }, [search, selectedProviders, selectedTypes]);

  const toggleProvider = (provider: string) => {
    setSelectedProviders((prev) =>
      prev.includes(provider)
        ? prev.filter((p) => p !== provider)
        : [...prev, provider]
    );
  };

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const resetFilters = () => {
    setSelectedProviders([]);
    setSelectedTypes([]);
    setSearch('');
  };

  const SidebarContent = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          {t('common.providers', 'Providers')}
        </h3>
        <div className="space-y-2">
          {PROVIDERS.map((provider) => (
            <div key={provider} className="flex items-center space-x-2">
              <Checkbox
                id={`provider-${provider}`}
                checked={selectedProviders.includes(provider)}
                onCheckedChange={() => toggleProvider(provider)}
              />
              <Label
                htmlFor={`provider-${provider}`}
                className="text-sm font-normal cursor-pointer"
              >
                {provider}
              </Label>
            </div>
          ))}
        </div>
      </div>
      <Separator />
      <div className="space-y-2">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          {t('common.types', 'Types')}
        </h3>
        <div className="space-y-2">
          {TYPES.map((type) => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                id={`type-${type}`}
                checked={selectedTypes.includes(type)}
                onCheckedChange={() => toggleType(type)}
              />
              <Label
                htmlFor={`type-${type}`}
                className="text-sm font-normal cursor-pointer"
              >
                {type}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 border-r bg-transparent p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-lg">{t('common.filtersTitle', 'Filters')}</h2>
          {(selectedProviders.length > 0 || selectedTypes.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-auto px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              {t('common.filters.reset', 'Reset')}
            </Button>
          )}
        </div>
        <ScrollArea className="h-[calc(100vh-10rem)] pr-4">
          <SidebarContent />
        </ScrollArea>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="border-b p-4 md:p-6 sticky top-0 z-10">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between max-w-6xl mx-auto w-full">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">
                {t('models.title', 'Available Models')}
              </h1>
              <p className="text-muted-foreground text-sm">
                {t(
                  'models.description',
                  'Explore competitive pricing and capabilities.'
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-80">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t('models.searchPlaceholder', 'Search models...')}
                  className="pl-9 bg-background/50"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="md:hidden">
                    <Filter className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <SheetHeader className="mb-6">
                    <SheetTitle>{t('common.filtersTitle', 'Filters')}</SheetTitle>
                  </SheetHeader>
                  <SidebarContent />
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 md:p-6 max-w-6xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredModels.map((model) => (
                <Card
                  key={model.id}
                  className="group hover:shadow-md transition-shadow duration-200"
                >
                  <CardHeader className="p-4 pb-2 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2">
                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <Box className="size-5" />
                        </div>
                        <div className="space-y-1">
                          <CardTitle className="text-base leading-none">
                            {model.name}
                          </CardTitle>
                          <div className="text-xs text-muted-foreground font-mono truncate max-w-[140px]" title={model.id}>
                            {model.id}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {model.provider}
                      </Badge>
                      <Badge variant="outline" className="text-xs font-normal">
                        {model.type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-4">
                    <CardDescription className="line-clamp-2 text-xs min-h-[2.5em]">
                      {model.description}
                    </CardDescription>

                    <Separator />

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Zap className="size-3" /> {t('models.input', 'Input')}
                        </span>
                        <span className="font-medium">
                          ${model.inputPrice} <span className="text-muted-foreground">/ 1M</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Coins className="size-3" /> {t('models.output', 'Output')}
                        </span>
                        <span className="font-medium">
                          ${model.outputPrice} <span className="text-muted-foreground">/ 1M</span>
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {filteredModels.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="bg-muted/50 p-6 rounded-full mb-4">
                  <Search className="size-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">
                  {t('models.noResults', 'No models found')}
                </h3>
                <p className="text-muted-foreground max-w-sm mt-2">
                  {t(
                    'models.noResultsDesc',
                    'Try adjusting your filters or search terms to find what you\'re looking for.'
                  )}
                </p>
                <Button
                  variant="outline"
                  className="mt-6"
                  onClick={resetFilters}
                >
                  {t('common.clearFilters', 'Clear Filters')}
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
