import { AuthUser, getTokenFromStorage } from '@/stores/authStore';

// Same domain, no need to add baseURL.
export const API_BASE_URL = '';

type JsonValue = string | number | boolean | null | any | JsonValue[] | { [key: string]: JsonValue };

type ErrorResponseBody = {
  message?: string;
  error?: string | { message?: string };
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isErrorResponseBody = (value: unknown): value is ErrorResponseBody => {
  if (!isRecord(value)) {
    return false;
  }

  const message = value.message;
  const error = value.error;

  const hasValidMessage = message === undefined || typeof message === 'string';

  const hasValidError =
    error === undefined ||
    typeof error === 'string' ||
    (isRecord(error) && (error.message === undefined || typeof error.message === 'string'));

  return hasValidMessage && hasValidError;
};

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: JsonValue;
  requireAuth?: boolean;
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const buildQueryString = (params: Record<string, any>): string => {
  const query = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return query ? `?${query}` : '';
};

export async function apiRequest<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = 'GET', headers = {}, body, requireAuth = false } = options;

  const url = `${API_BASE_URL}${endpoint}`;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add Authorization header if auth is required
  if (requireAuth) {
    const token = getTokenFromStorage();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const requestOptions: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body && method !== 'GET') {
    requestOptions.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorData: unknown = null;

      try {
        errorData = await response.json();
        if (isErrorResponseBody(errorData)) {
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = typeof errorData.error === 'string' ? errorData.error : errorData.error?.message || errorMessage;
          }
        }
      } catch {
        // If response is not JSON, use status text
      }

      throw new ApiError(errorMessage, response.status, errorData);
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return (await response.json()) as T;
    }

    return {} as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Network error occurred';
    throw new ApiError(message, 0);
  }
}

// System API endpoints
export const systemApi = {
  getStatus: (): Promise<{ isInitialized: boolean }> => apiRequest('/admin/system/status'),

  initialize: (data: {
    ownerEmail: string;
    ownerPassword: string;
    ownerFirstName: string;
    ownerLastName: string;
    brandName: string;
  }): Promise<{ success: boolean; message: string }> =>
    apiRequest('/admin/system/initialize', {
      method: 'POST',
      body: data,
    }),
};

// Auth API endpoints
export const authApi = {
  signIn: (data: {
    email: string;
    password: string;
  }): Promise<{
    user: AuthUser;
    token: string;
  }> =>
    apiRequest('/admin/auth/signin', {
      method: 'POST',
      body: data,
    }),
};

// Rerank API endpoints
export const rerankApi = {
  rerank: (data: {
    model: string;
    query: string;
    documents: string[];
    top_n?: number;
  }): Promise<{
    results: Array<{
      index: number;
      relevance_score: number;
      document?: string;
    }>;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  }> =>
    apiRequest('/v1/rerank', {
      method: 'POST',
      body: data,
      requireAuth: true,
    }),
};

// Pricing API endpoints
export interface ModelPricing {
  id: number;
  model: string;
  type: 'quota' | 'connection';
  quota: number;
  completion_ratio: number;
  price: number;
  created_at: string;
  updated_at: string;
  deleted_at: number;
  status?: 'enabled' | 'disabled' | 'archived';
}

export interface PricingListResponse {
  success: boolean;
  data: ModelPricing[];
}

export interface PricingUpsertRequest {
  model: string;
  type: 'quota' | 'connection';
  quota: number;
  price: number;
  completion_ratio: number;
}

export interface PricingUpsertResponse {
  success: boolean;
  data: ModelPricing;
}

export interface PricingToggleResponse {
  success: boolean;
  data: ModelPricing;
}

export interface PricingUpsertBatchRequest {
  items: PricingUpsertRequest[];
}

export interface PricingUpsertBatchResponse {
  success: boolean;
  data: ModelPricing[];
}

export const pricingApi = {
  getPricing: (): Promise<PricingListResponse> =>
    apiRequest('/admin/pricing', {
      method: 'GET',
      requireAuth: true,
    }),

  updatePricing: (data: PricingUpsertRequest): Promise<PricingUpsertResponse> =>
    apiRequest('/admin/pricing', {
      method: 'PUT',
      body: data,
      requireAuth: true,
    }),

  createPricing: (data: PricingUpsertRequest): Promise<PricingUpsertResponse> =>
    apiRequest('/admin/pricing', {
      method: 'POST',
      body: data,
      requireAuth: true,
    }),

  batchCreatePricing: (data: PricingUpsertBatchRequest): Promise<PricingUpsertBatchResponse> =>
    apiRequest('/admin/pricing/batch', {
      method: 'POST',
      body: data,
      requireAuth: true,
    }),

  disableModel: (model: string): Promise<PricingToggleResponse> =>
    apiRequest(`/admin/pricing/${encodeURIComponent(model)}/disable`, {
      method: 'PUT',
      requireAuth: true,
    }),

  enableModel: (model: string): Promise<PricingToggleResponse> =>
    apiRequest(`/admin/pricing/${encodeURIComponent(model)}/enable`, {
      method: 'PUT',
      requireAuth: true,
    }),

  deleteModel: (model: string): Promise<PricingToggleResponse> =>
    apiRequest(`/admin/pricing/${encodeURIComponent(model)}`, {
      method: 'DELETE',
      requireAuth: true,
    }),
};

// Billing Interfaces
export interface ConsumptionStatsRow {
  project_id: number;
  model: string;
  date: string;
  count: number;
  quota: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ConsumptionStatsResponse {
  success: boolean;
  data: ConsumptionStatsRow[];
}

export const billingApi = {
  getStats: (params: {
    project_id?: number;
    model?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<ConsumptionStatsResponse> =>
    apiRequest('/admin/billing/stats' + buildQueryString(params), {
      method: 'GET',
      requireAuth: true,
    }),
};

// Redemption Interfaces
export interface RedemptionCode {
  id: number;
  code: string;
  quota: number;
  status: 'active' | 'used' | 'disabled';
  expires_at: string | null;
  max_uses: number;
  used_times?: number;
  voided?: boolean;
  used_by?: number | null;
  used_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: number;
}

export interface RedemptionListResponse {
  success?: boolean;
  data: RedemptionCode[];
}

export interface RedemptionGenerateRequest {
  count: number;
  quota: number;
  max_uses?: number;
  expires_at?: string;
  export?: boolean;
}

export interface RedemptionGenerateResponse {
  data: string[];
}

export interface DeleteCodesRequest {
  ids: number[];
}

export const redemptionApi = {
  getRedemptions: (params: { page?: number; page_size?: number; keyword?: string } = {}): Promise<RedemptionListResponse> =>
    apiRequest('/admin/redemption' + buildQueryString(params), {
      method: 'GET',
      requireAuth: true,
    }),

  generate: (data: RedemptionGenerateRequest): Promise<RedemptionGenerateResponse> =>
    apiRequest('/admin/redemption/generate', {
      method: 'POST',
      body: data,
      requireAuth: true,
    }),

  delete: (ids: number[]): Promise<{ success: boolean }> =>
    apiRequest('/admin/redemption/delete', {
      method: 'POST',
      body: { ids },
      requireAuth: true,
    }),

  void: (id: number): Promise<RedemptionCode> =>
    apiRequest(`/admin/redemption/${id}/void`, {
      method: 'POST',
      requireAuth: true,
    }),
};

// Recharge Interfaces
export interface RechargeRecord {
  id: number;
  user_id: number;
  project_id: number;
  code_id: number;
  amount: number;
  status: 'success' | 'failed';
  trace_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RechargeListResponse {
  success: boolean;
  data: RechargeRecord[];
}

export const rechargeApi = {
  getRecharges: (params: { page?: number; page_size?: number; keyword?: string } = {}): Promise<RechargeListResponse> =>
    apiRequest('/admin/recharges' + buildQueryString(params), {
      method: 'GET',
      requireAuth: true,
    }),
};

// System Settings Interfaces
export interface SettingItem {
  key: string;
  value: any;
  description: string;
  updated_at: string;
}

export interface GetSystemSettingsResponse {
  settings: SettingItem[];
}

export interface UpdateSystemSettingsRequest {
  key: string;
  value: any;
  description?: string;
}

export interface UpdateSystemSettingsResponse {
  success: boolean;
  message: string;
  setting: SettingItem;
}

export const systemSettingsApi = {
  getSettings: (): Promise<GetSystemSettingsResponse> =>
    apiRequest('/admin/system/settings', {
      method: 'GET',
      requireAuth: true,
    }),

  updateSettings: (data: UpdateSystemSettingsRequest): Promise<UpdateSystemSettingsResponse> =>
    apiRequest('/admin/system/settings', {
      method: 'PUT',
      body: data,
      requireAuth: true,
    }),
};

// Sensitive Word Interfaces
export interface SensitiveWord {
  id: number;
  word: string;
  type: 'block' | 'replace';
  created_at: string;
  updated_at: string;
  deleted_at: number;
}

export interface AddWordRequest {
  word: string;
  type: 'block' | 'replace';
}

export interface SensitiveWordResponse {
  data: SensitiveWord;
}

export const filterApi = {
  addWord: (data: AddWordRequest): Promise<SensitiveWordResponse> =>
    apiRequest('/admin/filter/words', {
      method: 'POST',
      body: data,
      requireAuth: true,
    }),
};

// Shared Interfaces for Project/User
export interface SubscriptionData {
  quota: number;
  used_quota: number;
}

export interface SubscriptionResponse {
  success: boolean;
  data: SubscriptionData;
}

export interface ConsumptionRecord {
  id: number;
  user_id: number;
  project_id: number;
  model: string;
  quota: number;
  billing_multiplier: number;
  group_multiplier: number;
  model_multiplier: number;
  completion_ratio: number;
  trace_id: string | null;
  api_key_id: number | null;
  api_key_name: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  content: string | null;
  type: 'chat' | 'image';
  created_at: string;
  updated_at: string;
}

export interface UsageResponse {
  success: boolean;
  data: ConsumptionRecord[];
}

export interface DashboardStatsData {
  total_requests: number;
  completed_requests: number;
  failed_requests: number;
  canceled_requests: number;
  blocked_requests: number;
  average_latency_ms: number | null;
  average_first_token_latency_ms: number | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface DashboardStatsResponse {
  success: boolean;
  data: DashboardStatsData;
}

export interface RedeemRequest {
  code: string;
}

export interface RedeemResponse {
  status: string;
  quota: number;
}

export const projectApi = {
  getSubscription: (projectId: string): Promise<SubscriptionResponse> =>
    apiRequest('/project/billing/subscription', {
      method: 'GET',
      headers: {
        'X-Project-ID': projectId,
      },
      requireAuth: true,
    }),

  getUsage: (projectId: string, params: { page?: number; page_size?: number } = {}): Promise<UsageResponse> =>
    apiRequest('/project/billing/usage' + buildQueryString(params), {
      method: 'GET',
      headers: {
        'X-Project-ID': projectId,
      },
      requireAuth: true,
    }),

  getDashboardStats: (projectId: string, params: { start_date?: string; end_date?: string } = {}): Promise<DashboardStatsResponse> =>
    apiRequest('/project/dashboard/stats' + buildQueryString(params), {
      method: 'GET',
      headers: {
        'X-Project-ID': projectId,
      },
      requireAuth: true,
    }),

  getRecharges: (projectId: string, params: { page?: number; page_size?: number } = {}): Promise<RechargeListResponse> =>
    apiRequest('/project/recharges' + buildQueryString(params), {
      method: 'GET',
      headers: {
        'X-Project-ID': projectId,
      },
      requireAuth: true,
    }),

  redeem: (projectId: string, code: string): Promise<RedeemResponse> =>
    apiRequest('/project/redemption/redeem', {
      method: 'POST',
      headers: {
        'X-Project-ID': projectId,
      },
      body: { code },
      requireAuth: true,
    }),
};


