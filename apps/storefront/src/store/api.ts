import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  CartDto,
  OrderDto,
  PaginatedResult,
  ProductDto,
  StoreSettingsDto,
  UserDto,
  CategoryDto,
} from '@simmi/shared';
import { ensureCsrf, getGuestCartKey } from '../lib/api';

const rawBase = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1',
  credentials: 'include',
  prepareHeaders: async (headers) => {
    headers.set('x-guest-cart-key', getGuestCartKey());
    const csrf = await ensureCsrf();
    if (csrf) headers.set('x-csrf-token', csrf);
    return headers;
  },
});

export const storeApi = createApi({
  reducerPath: 'storeApi',
  baseQuery: rawBase,
  tagTypes: ['Cart', 'Auth', 'Orders', 'Products', 'Settings'],
  endpoints: (builder) => ({
    getSettings: builder.query<StoreSettingsDto, void>({
      query: () => '/settings',
      transformResponse: (r: { data: StoreSettingsDto }) => r.data,
      providesTags: ['Settings'],
    }),
    getContent: builder.query<
      { key: string; title: string; blocks: Record<string, unknown>; publishedAt?: string },
      string
    >({
      query: (key) => `/content/${key}`,
      transformResponse: (r: {
        data: { key: string; title: string; blocks: Record<string, unknown>; publishedAt?: string };
      }) => r.data,
    }),
    getProducts: builder.query<
      PaginatedResult<ProductDto>,
      { q?: string; category?: string; sort?: string; page?: number }
    >({
      query: (params) => ({ url: '/products', params }),
      transformResponse: (r: { data: PaginatedResult<ProductDto> }) => r.data,
      providesTags: ['Products'],
    }),
    getProduct: builder.query<
      { product: ProductDto; related: ProductDto[]; reviews: unknown[] },
      string
    >({
      query: (slug) => `/products/${slug}`,
      transformResponse: (r: {
        data: { product: ProductDto; related: ProductDto[]; reviews: unknown[] };
      }) => r.data,
    }),
    getCategories: builder.query<CategoryDto[], void>({
      query: () => '/products/categories',
      transformResponse: (r: { data: CategoryDto[] }) => r.data,
    }),
    getCart: builder.query<CartDto, void>({
      query: () => '/cart',
      transformResponse: (r: { data: CartDto }) => r.data,
      providesTags: ['Cart'],
    }),
    addToCart: builder.mutation<CartDto, { productId: string; variantId: string; quantity: number }>({
      query: (body) => ({ url: '/cart/items', method: 'POST', body }),
      transformResponse: (r: { data: CartDto }) => r.data,
      invalidatesTags: ['Cart'],
    }),
    updateCartItem: builder.mutation<CartDto, { itemId: string; quantity: number }>({
      query: ({ itemId, quantity }) => ({
        url: `/cart/items/${itemId}`,
        method: 'PATCH',
        body: { quantity },
      }),
      transformResponse: (r: { data: CartDto }) => r.data,
      invalidatesTags: ['Cart'],
    }),
    removeCartItem: builder.mutation<CartDto, string>({
      query: (itemId) => ({ url: `/cart/items/${itemId}`, method: 'DELETE' }),
      transformResponse: (r: { data: CartDto }) => r.data,
      invalidatesTags: ['Cart'],
    }),
    me: builder.query<{ user: UserDto }, void>({
      query: () => '/auth/me',
      transformResponse: (r: { data: { user: UserDto } }) => r.data,
      providesTags: ['Auth'],
    }),
    login: builder.mutation<{ user: UserDto; csrfToken: string }, { email: string; password: string }>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      transformResponse: (r: { data: { user: UserDto; csrfToken: string } }) => r.data,
      invalidatesTags: ['Auth', 'Cart'],
    }),
    register: builder.mutation<
      { user: UserDto; csrfToken: string },
      { name: string; email: string; phone: string; password: string }
    >({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      transformResponse: (r: { data: { user: UserDto; csrfToken: string } }) => r.data,
      invalidatesTags: ['Auth', 'Cart'],
    }),
    logout: builder.mutation<{ ok: boolean }, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      transformResponse: (r: { data: { ok: boolean } }) => r.data,
      invalidatesTags: ['Auth', 'Cart'],
    }),
    createOrder: builder.mutation<OrderDto, Record<string, unknown>>({
      query: (body) => ({ url: '/orders', method: 'POST', body }),
      transformResponse: (r: { data: OrderDto }) => r.data,
      invalidatesTags: ['Orders', 'Cart'],
    }),
    myOrders: builder.query<PaginatedResult<OrderDto>, void>({
      query: () => '/orders/my',
      transformResponse: (r: { data: PaginatedResult<OrderDto> }) => r.data,
      providesTags: ['Orders'],
    }),
    getOrder: builder.query<OrderDto, string>({
      query: (id) => `/orders/${id}`,
      transformResponse: (r: { data: OrderDto }) => r.data,
    }),
    getAddresses: builder.query<unknown[], void>({
      query: () => '/addresses',
      transformResponse: (r: { data: unknown[] }) => r.data,
    }),
  }),
});

export const {
  useGetSettingsQuery,
  useGetContentQuery,
  useGetProductsQuery,
  useGetProductQuery,
  useGetCategoriesQuery,
  useGetCartQuery,
  useAddToCartMutation,
  useUpdateCartItemMutation,
  useRemoveCartItemMutation,
  useMeQuery,
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useCreateOrderMutation,
  useMyOrdersQuery,
  useGetOrderQuery,
  useGetAddressesQuery,
} = storeApi;
