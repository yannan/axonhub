import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { graphqlRequest } from '@/gql/graphql';
import { ME_QUERY } from '@/gql/users';
import { toast } from 'sonner';
import { useAuthStore, setTokenToStorage, removeTokenFromStorage } from '@/stores/authStore';
import { AuthUser } from '@/stores/authStore';
import { authApi } from '@/lib/api-client';
import i18n from '@/lib/i18n';

export interface SignInInput {
  email: string;
  password: string;
}

interface MeResponse {
  me: AuthUser;
}

export function useMe() {
  const { setUser } = useAuthStore((state) => state.auth);

  const query = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const data = await graphqlRequest<MeResponse>(ME_QUERY);
      return data.me;
    },
    enabled: !!useAuthStore.getState().auth.accessToken,
    retry: false,
  });

  // Update auth store when data changes
  useEffect(() => {
    if (query.data) {
      const userLanguage = query.data.preferLanguage || 'en';

      setUser(query.data);

      // Initialize i18n with user's preferred language
      if (userLanguage !== i18n.language) {
        i18n.changeLanguage(userLanguage);
      }
    }
  }, [query.data, setUser]);

  return query;
}

export function useSignIn() {
  const { setUser, setAccessToken } = useAuthStore((state) => state.auth);
  const router = useRouter();

  return useMutation({
    mutationFn: async (input: SignInInput) => {
      return await authApi.signIn(input);
    },
    onSuccess: (data) => {
      // Store token in localStorage
      setTokenToStorage(data.token);

      const userLanguage = data.user.preferLanguage || 'en';

      // Update auth store
      setAccessToken(data.token);
      setUser(data.user);

      // Initialize i18n with user's preferred language
      if (userLanguage !== i18n.language) {
        i18n.changeLanguage(userLanguage);
      }

      toast.success(i18n.t('common.success.signedIn'));
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Failed to sign in';
      toast.error(errorMessage);
    },
  });
}

export function useSignOut() {
  const { reset } = useAuthStore((state) => state.auth);
  const router = useRouter();

  return async () => {
    // Navigate to root first to avoid AuthGuard redirecting to sign-in
    await router.navigate({ to: '/' });

    // Clear token from localStorage
    removeTokenFromStorage();

    // Clear auth store
    reset();

    toast.success(i18n.t('common.success.signedOut'));
  };
}
