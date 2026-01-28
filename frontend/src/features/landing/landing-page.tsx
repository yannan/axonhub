import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, Copy } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { Input } from '@/components/ui/input';
import {
  Moonshot,
  OpenAI,
  XAI,
  Zhipu,
  Volcengine,
  Cohere,
  Claude,
  Gemini,
  Suno,
  Minimax,
  Wenxin,
  Spark,
  Qingyan,
  DeepSeek,
  Qwen,
  Midjourney,
  Grok,
  AzureAI,
  Hunyuan,
  Xinference,
} from '@lobehub/icons';
const API_ENDPOINTS = [
  'https://api.openai.com',
  'https://api.anthropic.com',
  'https://api.gemini.google.com',
];

export function LandingPage() {
  const { t, i18n } = useTranslation();
  const serverAddress = `${window.location.origin}`+ '/v1/chat/completions';
  const { handleCopy } = useCopyToClipboard({
    text: serverAddress,
    copyMessage: t('common.copied', 'Copied to clipboard')
  });
  const [endpointIndex, setEndpointIndex] = useState(0);
  const isChinese = i18n.language.startsWith('zh');

  useEffect(() => {
    const timer = setInterval(() => {
      setEndpointIndex((prev) => (prev + 1) % API_ENDPOINTS.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleCopyBaseURL = () => {
    handleCopy();
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative w-full min-h-[400px] md:min-h-[500px] lg:min-h-[600px] flex items-center justify-center overflow-hidden">
        {/* Background Gradients removed as they are now in PublicLayout */}

        <div className="container relative z-10 flex flex-col items-center text-center px-4">
          <h1
            className={`text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-tight ${isChinese ? 'tracking-wide' : ''
              }`}
          >
            {t('landing.hero.unified', 'Unified AI Gateway for Enterprise')}
            <br />
            <span className="bg-gradient-to-r from-indigo-500 to-teal-400 bg-clip-text text-transparent">
              {t('landing.hero.gateway', 'Built for reliability, observability, and scale.')}
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg md:text-xl text-muted-foreground">
            {t(
              'landing.hero.description',
              'Just replace your model base URL with:'
            )}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full max-w-lg">
            <div className="relative flex-1 w-full">
              <Input
                readOnly
                value={serverAddress}
                className="pr-12 h-12 text-base rounded-full bg-background/80 backdrop-blur"
              />
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1 h-10 w-10 rounded-full"
                onClick={handleCopyBaseURL}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/sign-in">
              <Button size="lg" className="rounded-full px-8 text-base h-12 gap-2">
                {t('landing.hero.getStarted', 'Get API')}
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            {/* <Link to="/available-models">
              <Button
                variant="outline"
                size="lg"
                className="rounded-full px-8 text-base h-12 bg-background/50 backdrop-blur"
              >
                {t('landing.hero.viewModels', 'View Models')}
              </Button>
            </Link> */}
          </div> 
        </div>
      </section>

      {/* Features Section */}
      <section className="container py-8 md:py-12 space-y-12">
        {/* 框架兼容性图标 */}
        <div className='mt-12 md:mt-8 lg:mt-10 w-full'>
          <div className='flex items-center mb-6 md:mb-8 justify-center'>
            <span className='text-lg md:text-xl lg:text-2xl font-light' >
              {t('landing.supportedProviders')}
            </span>
          </div>
          <div className='flex flex-wrap items-center justify-center gap-3 sm:gap-4 md:gap-6 lg:gap-8 max-w-5xl mx-auto px-4'>
            <div className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center'>
              <Moonshot size={40} />
            </div>
            <div className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center'>
              <OpenAI size={40} />
            </div>
            <div className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center'>
              <XAI size={40} />
            </div>
            <div className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center'>
              <Zhipu.Color size={40} />
            </div>
            <div className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center'>
              <Volcengine.Color size={40} />
            </div>
            <div className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center'>
              <Cohere.Color size={40} />
            </div>
            <div className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center'>
              <Claude.Color size={40} />
            </div>
            <div className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center'>
              <Gemini.Color size={40} />
            </div>
            <div className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center'>
              <Suno size={40} />
            </div>
            <div className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center'>
              <Minimax.Color size={40} />
            </div>
            <div className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center'>
              <Wenxin.Color size={40} />
            </div>
            <div className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center'>
              <Spark.Color size={40} />
            </div>
            <div className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center'>
              <Qingyan.Color size={40} />
            </div>
            <div className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center'>
              <DeepSeek.Color size={40} />
            </div>
            <div className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center'>
              <Qwen.Color size={40} />
            </div>
            <div className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center'>
              <Midjourney size={40} />
            </div>
            <div className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center'>
              <Grok size={40} />
            </div>
            <div className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center'>
              <AzureAI.Color size={40} />
            </div>
            <div className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center'>
              <Hunyuan.Color size={40} />
            </div>
            <div className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center'>
              <Xinference.Color size={40} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
