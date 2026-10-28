import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  CategoryDto,
  OrderDto,
  PaginatedResult,
  ProductCreateInput,
  ProductDto,
  ProductUpdateInput,
  StoreSettingsDto,
  UserDto,
  UserRole,
} from '@simmi/shared';
import { ensureCsrf, setCsrfToken } from '../lib/api';

export type AdminCategory = CategoryDto & {
  imageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
  isArchived?: boolean;
  productCount?: number;
};

export type InventoryMovement = {
  id: string;
  sku: string;
  quantityChange: number;
  reason: string;
  note?: string;
  resultingStock: number;
  createdAt: string;
};

export type AdminCustomer = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  accountStatus: string;
  supportNotes?: string;
  createdAt: string;
};

export type AdminCoupon = {
  id: string;
  code: string;
  type: string;
  value: number;
  minOrderPaise: number;
  maxDiscountPaise?: number;
  startsAt: string;
  expiresAt: string;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  accountStatus: string;
  createdAt: string;
  lastLoginAt?: string;
};

export type AuditLog = {
  id: string;
  actorId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  meta?: unknown;
  createdAt: string;
};

export type ContentDoc = {
  id: string;
  key: string;
  title: string;
  status: 'draft' | 'published';
  blocks: Record<string, unknown>;
  publishedAt?: string;
  updatedAt?: string;
};

export type DateRangeParams = { from?: string; to?: string };

export const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1',
    credentials: 'include',
    prepareHeaders: async (headers, { type }) => {
      // CSRF only required for mutations; avoid extra /csrf round-trips on queries
      if (type === 'mutation') {
        const csrf = await ensureCsrf();
        if (csrf) headers.set('x-csrf-token', csrf);
      }
      return headers;
    },
  }),
  tagTypes: [
    'Auth',
    'Dashboard',
    'Products',
    'Orders',
    'Customers',
    'Inventory',
    'Coupons',
    'Settings',
    'Reports',
    'Categories',
    'Admins',
    'Audit',
    'Content',
  ],
  endpoints: (builder) => ({
    me: builder.query<{ user: UserDto }, void>({
      query: () => '/auth/me',
      transformResponse: (r: { data: { user: UserDto } }) => r.data,
      providesTags: ['Auth'],
    }),
    login: builder.mutation<{ user: UserDto; csrfToken: string }, { email: string; password: string }>({
      query: (body) => ({ url: '/auth/admin/login', method: 'POST', body }),
      transformResponse: (r: { data: { user: UserDto; csrfToken: string } }) => {
        if (r.data.csrfToken) setCsrfToken(r.data.csrfToken);
        return r.data;
      },
      invalidatesTags: ['Auth'],
    }),
    logout: builder.mutation<{ ok: boolean }, void>({
      query: () => ({ url: '/auth/admin/logout', method: 'POST' }),
      transformResponse: (r: { data: { ok: boolean } }) => r.data,
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          setCsrfToken('');
        }
      },
      invalidatesTags: ['Auth'],
    }),
    dashboard: builder.query<Record<string, unknown>, DateRangeParams | void>({
      query: (params) => ({
        url: '/admin/dashboard',
        params: params ?? undefined,
      }),
      transformResponse: (r: { data: Record<string, unknown> }) => r.data,
      providesTags: ['Dashboard'],
    }),
    products: builder.query<
      PaginatedResult<ProductDto>,
      { q?: string; page?: number; status?: string }
    >({
      query: (params) => ({ url: '/admin/products', params }),
      transformResponse: (r: { data: PaginatedResult<ProductDto> }) => r.data,
      providesTags: ['Products'],
    }),
    product: builder.query<ProductDto, string>({
      query: (id) => `/admin/products/${id}`,
      transformResponse: (r: { data: ProductDto }) => r.data,
      providesTags: (_r, _e, id) => [{ type: 'Products', id }],
    }),
    categories: builder.query<AdminCategory[], void>({
      query: () => '/admin/categories',
      transformResponse: (r: { data: AdminCategory[] }) => r.data,
      providesTags: ['Categories'],
    }),
    createCategory: builder.mutation<
      AdminCategory,
      {
        nameEn: string;
        nameHi: string;
        slug: string;
        description?: string;
        imageUrl?: string;
        sortOrder?: number;
        isActive?: boolean;
      }
    >({
      query: (body) => ({ url: '/admin/categories', method: 'POST', body }),
      transformResponse: (r: { data: AdminCategory }) => r.data,
      invalidatesTags: ['Categories'],
    }),
    updateCategory: builder.mutation<
      AdminCategory,
      {
        id: string;
        body: Partial<{
          nameEn: string;
          nameHi: string;
          slug: string;
          description: string;
          imageUrl: string;
          sortOrder: number;
          isActive: boolean;
        }>;
      }
    >({
      query: ({ id, body }) => ({ url: `/admin/categories/${id}`, method: 'PATCH', body }),
      transformResponse: (r: { data: AdminCategory }) => r.data,
      invalidatesTags: ['Categories'],
    }),
    archiveCategory: builder.mutation<AdminCategory, string>({
      query: (id) => ({ url: `/admin/categories/${id}/archive`, method: 'POST' }),
      transformResponse: (r: { data: AdminCategory }) => r.data,
      invalidatesTags: ['Categories'],
    }),
    createProduct: builder.mutation<ProductDto, ProductCreateInput>({
      query: (body) => ({ url: '/admin/products', method: 'POST', body }),
      transformResponse: (r: { data: ProductDto }) => r.data,
      invalidatesTags: ['Products', 'Dashboard'],
    }),
    updateProduct: builder.mutation<ProductDto, { id: string; body: ProductUpdateInput }>({
      query: ({ id, body }) => ({ url: `/admin/products/${id}`, method: 'PATCH', body }),
      transformResponse: (r: { data: ProductDto }) => r.data,
      invalidatesTags: (_r, _e, arg) => ['Products', 'Dashboard', { type: 'Products', id: arg.id }],
    }),
    archiveProduct: builder.mutation<ProductDto, string>({
      query: (id) => ({ url: `/admin/products/${id}/archive`, method: 'POST' }),
      transformResponse: (r: { data: ProductDto }) => r.data,
      invalidatesTags: ['Products'],
    }),
    orders: builder.query<PaginatedResult<OrderDto>, { q?: string; status?: string; page?: number }>({
      query: (params) => ({ url: '/admin/orders', params }),
      transformResponse: (r: { data: PaginatedResult<OrderDto> }) => r.data,
      providesTags: ['Orders'],
    }),
    order: builder.query<
      {
        order: OrderDto;
        payment: {
          id: string;
          provider: string;
          status: string;
          amountPaise: number;
          providerOrderId?: string;
          providerPaymentId?: string;
        } | null;
        internalNotes?: string;
      },
      string
    >({
      query: (id) => `/admin/orders/${id}`,
      transformResponse: (r: {
        data: {
          order: OrderDto;
          payment: {
            id: string;
            provider: string;
            status: string;
            amountPaise: number;
            providerOrderId?: string;
            providerPaymentId?: string;
          } | null;
          internalNotes?: string;
        };
      }) => r.data,
      providesTags: (_r, _e, id) => [{ type: 'Orders', id }],
    }),
    updateOrderStatus: builder.mutation<
      OrderDto,
      { id: string; status: string; trackingNumber?: string; courierName?: string; note?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/admin/orders/${id}/status`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (r: { data: OrderDto }) => r.data,
      invalidatesTags: ['Orders', 'Dashboard'],
    }),
    updateOrderNotes: builder.mutation<{ id: string; internalNotes: string }, { id: string; internalNotes: string }>({
      query: ({ id, internalNotes }) => ({
        url: `/admin/orders/${id}/notes`,
        method: 'PATCH',
        body: { internalNotes },
      }),
      transformResponse: (r: { data: { id: string; internalNotes: string } }) => r.data,
      invalidatesTags: (_r, _e, arg) => [{ type: 'Orders', id: arg.id }],
    }),
    cancelOrder: builder.mutation<OrderDto, string>({
      query: (id) => ({ url: `/admin/orders/${id}/cancel`, method: 'POST' }),
      transformResponse: (r: { data: OrderDto }) => r.data,
      invalidatesTags: ['Orders', 'Dashboard'],
    }),
    refundOrder: builder.mutation<
      {
        id: string;
        status: string;
        providerRefunded: boolean;
        providerRefundId?: string;
        note: string;
      },
      { id: string; amountPaise: number; reason: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/admin/orders/${id}/refund`,
        method: 'POST',
        body,
      }),
      transformResponse: (r: {
        data: {
          id: string;
          status: string;
          providerRefunded: boolean;
          providerRefundId?: string;
          note: string;
        };
      }) => r.data,
      invalidatesTags: ['Orders', 'Dashboard'],
    }),
    customers: builder.query<PaginatedResult<AdminCustomer>, { q?: string; page?: number }>({
      query: (params) => ({ url: '/admin/customers', params }),
      transformResponse: (r: { data: PaginatedResult<AdminCustomer> }) => r.data,
      providesTags: ['Customers'],
    }),
    customer: builder.query<
      {
        customer: AdminCustomer;
        summary: { totalOrders: number; paidOrders: number; paidRevenuePaise: number };
        orders: OrderDto[];
      },
      string
    >({
      query: (id) => `/admin/customers/${id}`,
      transformResponse: (r: {
        data: {
          customer: AdminCustomer;
          summary: { totalOrders: number; paidOrders: number; paidRevenuePaise: number };
          orders: OrderDto[];
        };
      }) => r.data,
      providesTags: (_r, _e, id) => [{ type: 'Customers', id }],
    }),
    updateCustomer: builder.mutation<
      { id: string; accountStatus: string; supportNotes?: string },
      { id: string; body: { accountStatus?: string; supportNotes?: string } }
    >({
      query: ({ id, body }) => ({ url: `/admin/customers/${id}`, method: 'PATCH', body }),
      transformResponse: (r: { data: { id: string; accountStatus: string; supportNotes?: string } }) =>
        r.data,
      invalidatesTags: (_r, _e, arg) => ['Customers', { type: 'Customers', id: arg.id }],
    }),
    inventory: builder.query<Record<string, unknown>[], void>({
      query: () => '/admin/inventory',
      transformResponse: (r: { data: Record<string, unknown>[] }) => r.data,
      providesTags: ['Inventory'],
    }),
    inventoryMovements: builder.query<PaginatedResult<InventoryMovement>, { page?: number; limit?: number }>({
      query: (params) => ({ url: '/admin/inventory/movements', params }),
      transformResponse: (r: { data: PaginatedResult<InventoryMovement> }) => r.data,
      providesTags: ['Inventory'],
    }),
    adjustInventory: builder.mutation<
      unknown,
      { productId: string; variantId: string; quantityChange: number; note: string }
    >({
      query: (body) => ({ url: '/admin/inventory/adjust', method: 'POST', body }),
      invalidatesTags: ['Inventory', 'Products', 'Dashboard'],
    }),
    coupons: builder.query<AdminCoupon[], void>({
      query: () => '/admin/coupons',
      transformResponse: (r: { data: AdminCoupon[] }) => r.data,
      providesTags: ['Coupons'],
    }),
    createCoupon: builder.mutation<unknown, Record<string, unknown>>({
      query: (body) => ({ url: '/admin/coupons', method: 'POST', body }),
      invalidatesTags: ['Coupons'],
    }),
    updateCoupon: builder.mutation<
      { id: string; code: string; isActive: boolean },
      { id: string; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => ({ url: `/admin/coupons/${id}`, method: 'PATCH', body }),
      transformResponse: (r: { data: { id: string; code: string; isActive: boolean } }) => r.data,
      invalidatesTags: ['Coupons'],
    }),
    salesReport: builder.query<
      { sales: { _id: string; orders: number; revenuePaise: number }[]; from?: string; to?: string },
      DateRangeParams | void
    >({
      query: (params) => ({
        url: '/admin/reports/sales',
        params: params ?? undefined,
      }),
      transformResponse: (r: {
        data: { sales: { _id: string; orders: number; revenuePaise: number }[]; from?: string; to?: string };
      }) => r.data,
      providesTags: ['Reports'],
    }),
    settings: builder.query<StoreSettingsDto, void>({
      query: () => '/admin/settings',
      transformResponse: (r: { data: StoreSettingsDto }) => r.data,
      providesTags: ['Settings'],
    }),
    updateSettings: builder.mutation<StoreSettingsDto, Record<string, unknown>>({
      query: (body) => ({ url: '/admin/settings', method: 'PATCH', body }),
      transformResponse: (r: { data: StoreSettingsDto }) => r.data,
      invalidatesTags: ['Settings'],
    }),
    admins: builder.query<AdminUser[], void>({
      query: () => '/admin/admins',
      transformResponse: (r: { data: AdminUser[] }) => r.data,
      providesTags: ['Admins'],
    }),
    createAdmin: builder.mutation<
      { id: string; name: string; email: string; role: UserRole },
      { name: string; email: string; password: string; role: UserRole }
    >({
      query: (body) => ({ url: '/admin/admins', method: 'POST', body }),
      transformResponse: (r: { data: { id: string; name: string; email: string; role: UserRole } }) =>
        r.data,
      invalidatesTags: ['Admins'],
    }),
    updateAdmin: builder.mutation<
      { id: string; role: UserRole; accountStatus: string },
      { id: string; body: { role?: UserRole; accountStatus?: string } }
    >({
      query: ({ id, body }) => ({ url: `/admin/admins/${id}`, method: 'PATCH', body }),
      transformResponse: (r: { data: { id: string; role: UserRole; accountStatus: string } }) => r.data,
      invalidatesTags: ['Admins'],
    }),
    auditLogs: builder.query<PaginatedResult<AuditLog>, { page?: number; limit?: number }>({
      query: (params) => ({ url: '/admin/audit-logs', params }),
      transformResponse: (r: { data: PaginatedResult<AuditLog> }) => r.data,
      providesTags: ['Audit'],
    }),
    content: builder.query<ContentDoc[], void>({
      query: () => '/admin/content',
      transformResponse: (r: { data: ContentDoc[] }) => r.data,
      providesTags: ['Content'],
    }),
    upsertContent: builder.mutation<
      ContentDoc,
      { key: string; title: string; status: 'draft' | 'published'; blocks: Record<string, unknown> }
    >({
      query: ({ key, ...body }) => ({ url: `/admin/content/${key}`, method: 'PUT', body }),
      transformResponse: (r: { data: ContentDoc }) => r.data,
      invalidatesTags: ['Content'],
    }),
  }),
});

export const {
  useMeQuery,
  useLoginMutation,
  useLogoutMutation,
  useDashboardQuery,
  useProductsQuery,
  useProductQuery,
  useCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useArchiveCategoryMutation,
  useCreateProductMutation,
  useUpdateProductMutation,
  useArchiveProductMutation,
  useOrdersQuery,
  useOrderQuery,
  useUpdateOrderStatusMutation,
  useUpdateOrderNotesMutation,
  useCancelOrderMutation,
  useRefundOrderMutation,
  useCustomersQuery,
  useCustomerQuery,
  useUpdateCustomerMutation,
  useInventoryQuery,
  useInventoryMovementsQuery,
  useAdjustInventoryMutation,
  useCouponsQuery,
  useCreateCouponMutation,
  useUpdateCouponMutation,
  useSalesReportQuery,
  useSettingsQuery,
  useUpdateSettingsMutation,
  useAdminsQuery,
  useCreateAdminMutation,
  useUpdateAdminMutation,
  useAuditLogsQuery,
  useContentQuery,
  useUpsertContentMutation,
} = adminApi;
