export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'SIMMI MASALA API',
    version: '1.0.0',
    description: 'REST API for the SIMMI MASALA e-commerce platform',
  },
  servers: [{ url: '/api/v1' }],
  paths: {
    '/health': { get: { summary: 'Liveness', responses: { '200': { description: 'OK' } } } },
    '/auth/register': { post: { summary: 'Customer register', tags: ['Auth'] } },
    '/auth/login': { post: { summary: 'Customer login', tags: ['Auth'] } },
    '/auth/admin/login': { post: { summary: 'Admin login', tags: ['Auth'] } },
    '/auth/me': { get: { summary: 'Current user', tags: ['Auth'] } },
    '/products': { get: { summary: 'List products', tags: ['Catalogue'] } },
    '/products/{slug}': { get: { summary: 'Product detail', tags: ['Catalogue'] } },
    '/cart': { get: { summary: 'Get cart', tags: ['Cart'] } },
    '/orders': { post: { summary: 'Create order', tags: ['Orders'] } },
    '/payments/razorpay/create-order': { post: { summary: 'Create Razorpay order', tags: ['Payments'] } },
    '/payments/razorpay/verify': { post: { summary: 'Verify Razorpay payment', tags: ['Payments'] } },
    '/payments/razorpay/webhook': { post: { summary: 'Razorpay webhook', tags: ['Payments'] } },
    '/admin/dashboard': { get: { summary: 'Admin dashboard', tags: ['Admin'] } },
    '/admin/products': { get: { summary: 'Admin products', tags: ['Admin'] }, post: { summary: 'Create product', tags: ['Admin'] } },
    '/admin/orders': { get: { summary: 'Admin orders', tags: ['Admin'] } },
    '/admin/settings': { get: { summary: 'Get settings', tags: ['Admin'] }, patch: { summary: 'Update settings', tags: ['Admin'] } },
  },
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'simmi_session' },
      csrf: { type: 'apiKey', in: 'header', name: 'x-csrf-token' },
    },
  },
};
