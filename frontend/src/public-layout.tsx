import { Link, Outlet } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { ThemeSwitch } from '@/components/theme-switch';
import { LanguageSwitch } from '@/components/language-switch';
import { useBrandSettings } from '@/features/system/data/system';

export function PublicLayout() {
  const { t } = useTranslation();
  const { user } = useAuthStore((state) => state.auth);
  const { data: brandSettings } = { data: {
        brandName: 'GodawnAi',
        brandLogo: '/logo.jpg',
      }}
  //useBrandSettings();
  const displayName = brandSettings?.brandName || 'GodawnAi';

  const isAuthenticated = !!user;

  return (
    <div className="flex min-h-screen flex-col text-foreground relative">
      {/* Global Background Gradients */}
      <div className="fixed top-0 left-0 w-full h-[800px] overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/20 rounded-full blur-[100px]" />
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-500/20 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-background/0 backdrop-blur-sm supports-[backdrop-filter]:bg-background/0 text-2xl">
        <div className="container flex h-14 items-center justify-between">
          {/* Logo & Nav */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 font-bold ">
              <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded">
                {brandSettings?.brandLogo ? (
                  <img
                    src={brandSettings.brandLogo}
                    alt={t('common.brandLogoAlt')}
                    className="size-8 object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/logo.jpg';
                    }}
                  />
                ) : (
                  <img src="/logo.jpg" alt={t('common.defaultLogoAlt')} className="size-8 object-cover" />
                )}
              </div>
              <span >{displayName}</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-2xl font-medium">
              <Link
                to="/"
                activeProps={{ className: 'text-primary' }}
                inactiveProps={{ className: 'text-muted-foreground hover:text-primary' }}
              >
                {t('common.home')}
              </Link>
              <Link
                to="/available-models"
                activeProps={{ className: 'text-primary' }}
                inactiveProps={{ className: 'text-muted-foreground hover:text-primary' }}
              >
                {t('common.models')}
              </Link>
            </nav>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <LanguageSwitch />
              <ThemeSwitch />
            </div>
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button>{t('common.dashboard')}</Button>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/sign-in">
                  <Button variant="ghost">{t('auth.signIn.title')}</Button>
                </Link>
                <Link to="/sign-up">
                  <Button variant="ghost">{t('auth.signUp.title')}</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
            © {new Date().getFullYear()} {displayName}. {t('common.allRightsReserved')}
          </p>
        </div>
      </footer>
    </div>
  );
}
