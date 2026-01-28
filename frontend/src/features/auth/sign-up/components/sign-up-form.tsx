import { HTMLAttributes, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/password-input';
import { useTranslation } from 'react-i18next';

type SignUpFormProps = HTMLAttributes<HTMLFormElement>;

export function SignUpForm({ className, ...props }: SignUpFormProps) {
  const { t } = useTranslation();

  const formSchema = z
    .object({
      email: z
        .string()
        .min(1, { message: t('auth.signUp.validation.emailRequired') })
        .email({ message: t('auth.signUp.validation.emailInvalid') }),
      password: z
        .string()
        .min(1, {
          message: t('auth.signUp.validation.passwordRequired'),
        })
        .min(7, {
          message: t('auth.signUp.validation.passwordMinLength'),
        }),
      confirmPassword: z.string().min(1, { message: t('auth.signUp.validation.confirmPasswordRequired') }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('auth.signUp.validation.passwordsDoNotMatch'),
      path: ['confirmPassword'],
    });

  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
    }, 3000);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn('grid gap-3', className)} {...props}>
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('auth.signUp.form.email.label')}</FormLabel>
              <FormControl>
                <Input placeholder={t('auth.signUp.form.email.placeholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('auth.signUp.form.password.label')}</FormLabel>
              <FormControl>
                <PasswordInput placeholder={t('auth.signUp.form.password.placeholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='confirmPassword'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('auth.signUp.form.confirmPassword.label')}</FormLabel>
              <FormControl>
                <PasswordInput placeholder={t('auth.signUp.form.confirmPassword.placeholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className='mt-2' disabled={isLoading}>
          {isLoading ? t('auth.signUp.form.submitting') : t('auth.signUp.form.submit')}
        </Button>

        {/* <div className='relative my-2'>
          <div className='absolute inset-0 flex items-center'>
            <span className='w-full border-t' />
          </div>
          <div className='relative flex justify-center text-xs uppercase'>
            <span className='bg-background text-muted-foreground px-2'>
              Or continue with
            </span>
          </div>
        </div>

        <div className='grid grid-cols-2 gap-2'>
          <Button
            variant='outline'
            className='w-full'
            type='button'
            disabled={isLoading}
          >
            <IconBrandGithub className='h-4 w-4' /> GitHub
          </Button>
          <Button
            variant='outline'
            className='w-full'
            type='button'
            disabled={isLoading}
          >
            <IconBrandFacebook className='h-4 w-4' /> Facebook
          </Button>
        </div> */}
      </form>
    </Form>
  );
}
