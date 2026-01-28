import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import AuthLayout from '../auth-layout';
import { SignUpForm } from './components/sign-up-form';

export default function SignUp() {
  const { t } = useTranslation();

  return (
    <AuthLayout>
      <div className='flex min-h-screen w-full items-center justify-center p-4'>
        <Card className='w-full gap-4 md:w-1/2'>
          <CardHeader>
            <CardTitle className='text-lg tracking-tight'>{t('auth.signUp.cardTitle')}</CardTitle>
            <CardDescription>
              {t('auth.signUp.cardDescription')} <br />
              {t('auth.signUp.alreadyHaveAccount')}{' '}
              <Link to='/sign-in' className='hover:text-primary underline underline-offset-4'>
                {t('auth.signUp.signInLink')}
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignUpForm />
          </CardContent>
          <CardFooter>
            {/* <p className='text-muted-foreground px-8 text-center text-sm'>
              {t('auth.signUp.agreement')}{' '}
              <a href='/terms' className='hover:text-primary underline underline-offset-4'>
                {t('auth.signUp.termsOfService')}
              </a>{' '}
              {t('auth.signUp.and')}{' '}
              <a href='/privacy' className='hover:text-primary underline underline-offset-4'>
                {t('auth.signUp.privacyPolicy')}
              </a>
              .
            </p> */}
          </CardFooter>
        </Card>
      </div>
    </AuthLayout>
  );
}
