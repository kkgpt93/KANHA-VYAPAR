import type {
  ColorThemeId,
  CreatorConfig,
  Customer,
  GeneratedKeyRecord,
  Invoice,
  LicenseState,
  NotificationItem,
  Product,
  StoreSettings,
  User,
} from '../types';

export interface StoreBootstrapResponse {
  hasCloudData: boolean;
  settings: StoreSettings | null;
  colorTheme: ColorThemeId | null;
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  staffUsers: User[];
  notifications: NotificationItem[];
  licenseRecord: {
    licenseState: LicenseState;
    generatedKeys: GeneratedKeyRecord[];
    creatorConfig: CreatorConfig;
  } | null;
}

export type HeadersProvider = () => Promise<Record<string, string>>;

async function apiRequest<T>(
  url: string,
  options: RequestInit,
  getAuthHeaders: HeadersProvider
): Promise<T> {
  const authHeaders = await getAuthHeaders();
  if (!authHeaders.Authorization) {
    throw new Error('Authentication required.');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let errorMessage = `Request failed (${response.status})`;
    try {
      const errBody = await response.json();
      if (errBody && typeof errBody.error === 'string') {
        errorMessage = errBody.error;
      }
    } catch {
      // ignore non-json error bodies
    }
    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}

export const StoreApiClient = {
  bootstrap(getAuthHeaders: HeadersProvider): Promise<StoreBootstrapResponse> {
    return apiRequest<StoreBootstrapResponse>(
      '/api/store/bootstrap',
      { method: 'GET' },
      getAuthHeaders
    );
  },

  syncAll(
    payload: {
      settings: StoreSettings;
      colorTheme: ColorThemeId;
      products: Product[];
      customers: Customer[];
      invoices: Invoice[];
      staffUsers: User[];
      notifications: NotificationItem[];
      licenseState: LicenseState;
      generatedKeys: GeneratedKeyRecord[];
      creatorConfig: CreatorConfig;
    },
    getAuthHeaders: HeadersProvider
  ): Promise<{ ok: boolean }> {
    return apiRequest<{ ok: boolean }>(
      '/api/store/sync-all',
      { method: 'POST', body: JSON.stringify(payload) },
      getAuthHeaders
    );
  },

  saveSettings(
    settings: StoreSettings,
    colorTheme: ColorThemeId,
    getAuthHeaders: HeadersProvider
  ): Promise<{ ok: boolean }> {
    return apiRequest<{ ok: boolean }>(
      '/api/store/settings',
      { method: 'PUT', body: JSON.stringify({ settings, colorTheme }) },
      getAuthHeaders
    );
  },

  upsertProduct(product: Product, getAuthHeaders: HeadersProvider): Promise<{ ok: boolean }> {
    return apiRequest<{ ok: boolean }>(
      `/api/store/products/${encodeURIComponent(product.id)}`,
      { method: 'PUT', body: JSON.stringify(product) },
      getAuthHeaders
    );
  },

  deleteProduct(id: string, getAuthHeaders: HeadersProvider): Promise<{ ok: boolean }> {
    return apiRequest<{ ok: boolean }>(
      `/api/store/products/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      getAuthHeaders
    );
  },

  upsertCustomer(customer: Customer, getAuthHeaders: HeadersProvider): Promise<{ ok: boolean }> {
    return apiRequest<{ ok: boolean }>(
      `/api/store/customers/${encodeURIComponent(customer.id)}`,
      { method: 'PUT', body: JSON.stringify(customer) },
      getAuthHeaders
    );
  },

  deleteCustomer(id: string, getAuthHeaders: HeadersProvider): Promise<{ ok: boolean }> {
    return apiRequest<{ ok: boolean }>(
      `/api/store/customers/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      getAuthHeaders
    );
  },

  upsertInvoice(invoice: Invoice, getAuthHeaders: HeadersProvider): Promise<{ ok: boolean }> {
    return apiRequest<{ ok: boolean }>(
      `/api/store/invoices/${encodeURIComponent(invoice.id)}`,
      { method: 'PUT', body: JSON.stringify(invoice) },
      getAuthHeaders
    );
  },

  upsertStaffUser(user: User, getAuthHeaders: HeadersProvider): Promise<{ ok: boolean }> {
    return apiRequest<{ ok: boolean }>(
      `/api/store/staff/${encodeURIComponent(user.id)}`,
      { method: 'PUT', body: JSON.stringify(user) },
      getAuthHeaders
    );
  },

  deleteStaffUser(id: string, getAuthHeaders: HeadersProvider): Promise<{ ok: boolean }> {
    return apiRequest<{ ok: boolean }>(
      `/api/store/staff/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      getAuthHeaders
    );
  },

  upsertNotification(
    notif: NotificationItem,
    getAuthHeaders: HeadersProvider
  ): Promise<{ ok: boolean }> {
    return apiRequest<{ ok: boolean }>(
      `/api/store/notifications/${encodeURIComponent(notif.id)}`,
      { method: 'PUT', body: JSON.stringify(notif) },
      getAuthHeaders
    );
  },

  markNotificationRead(id: string, getAuthHeaders: HeadersProvider): Promise<{ ok: boolean }> {
    return apiRequest<{ ok: boolean }>(
      `/api/store/notifications/${encodeURIComponent(id)}/read`,
      { method: 'PATCH' },
      getAuthHeaders
    );
  },

  clearNotifications(getAuthHeaders: HeadersProvider): Promise<{ ok: boolean }> {
    return apiRequest<{ ok: boolean }>(
      '/api/store/notifications',
      { method: 'DELETE' },
      getAuthHeaders
    );
  },

  saveLicenseRecord(
    payload: {
      licenseState: LicenseState;
      generatedKeys: GeneratedKeyRecord[];
      creatorConfig: CreatorConfig;
    },
    getAuthHeaders: HeadersProvider
  ): Promise<{ ok: boolean }> {
    return apiRequest<{ ok: boolean }>(
      '/api/store/license',
      { method: 'PUT', body: JSON.stringify(payload) },
      getAuthHeaders
    );
  },

  clearAllStoreData(
    payload: {
      settings: StoreSettings;
      colorTheme: ColorThemeId;
      staffUsers: User[];
    },
    getAuthHeaders: HeadersProvider
  ): Promise<{ ok: boolean }> {
    return apiRequest<{ ok: boolean }>(
      '/api/store/clear',
      { method: 'POST', body: JSON.stringify(payload) },
      getAuthHeaders
    );
  },
};
