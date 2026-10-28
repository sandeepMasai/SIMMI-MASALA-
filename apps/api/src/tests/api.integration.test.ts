import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../app.js';
import { CategoryModel } from '../modules/categories/category.model.js';
import { ProductModel } from '../modules/products/product.model.js';
import { StoreSettingsModel } from '../modules/settings/settings.model.js';
import { UserModel } from '../modules/users/user.model.js';
import { hashPassword } from '../modules/auth/password.js';

let mongod: MongoMemoryServer;
const app = createApp();

async function csrfAgent() {
  const agent = request.agent(app);
  const res = await agent.get('/api/v1/auth/csrf');
  const token = res.body.data.csrfToken as string;
  return { agent, token };
}

beforeAll(async () => {
  process.env.SESSION_SECRET = 'dev-only-session-secret-change-me-32chars';
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await StoreSettingsModel.create({ singletonKey: 'store', codEnabled: true });
  const cat = await CategoryModel.create({
    nameEn: 'Spices',
    nameHi: 'मसाले',
    slug: 'spices',
  });
  await ProductModel.create({
    nameEn: 'Turmeric Powder',
    nameHi: 'हल्दी पाउडर',
    slug: 'turmeric-powder',
    brandName: 'SIMMI MASALA',
    shortDescription: 'DEV PLACEHOLDER short description',
    description: 'DEV PLACEHOLDER full description for turmeric powder.',
    categoryId: cat._id,
    status: 'active',
    isActive: true,
    isFeatured: true,
    isPlaceholderContent: true,
    images: [],
    labelInfo: {},
    variants: [
      {
        sku: 'SM-HALDI-100G',
        packWeightGrams: 100,
        pricePaise: 8000,
        stockQuantity: 50,
        reservedQuantity: 0,
        lowStockThreshold: 5,
        shippingWeightGrams: 120,
        isActive: true,
      },
    ],
  });
  await UserModel.create({
    name: 'Admin',
    email: 'admin@test.local',
    passwordHash: await hashPassword('Admin1234'),
    role: 'super_admin',
    emailVerifiedAt: new Date(),
  });
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('API integration', () => {
  it('lists products', async () => {
    const res = await request(app).get('/api/v1/products');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });

  it('registers, adds to cart, and places COD order', async () => {
    const { agent, token } = await csrfAgent();
    const guestKey = 'guest-test-key-1';
    const register = await agent
      .post('/api/v1/auth/register')
      .set('x-csrf-token', token)
      .set('x-guest-cart-key', guestKey)
      .send({
        name: 'Test User',
        email: 'buyer@test.local',
        phone: '9876543210',
        password: 'Buyer1234',
      });
    expect(register.status).toBe(201);
    const csrf = register.body.data.csrfToken as string;

    const products = await agent.get('/api/v1/products');
    const product = products.body.data.items[0];
    const variant = product.variants[0];

    const cart = await agent
      .post('/api/v1/cart/items')
      .set('x-csrf-token', csrf)
      .send({ productId: product.id, variantId: variant.id, quantity: 1 });
    expect(cart.status).toBe(201);

    const order = await agent
      .post('/api/v1/orders')
      .set('x-csrf-token', csrf)
      .send({
        paymentMethod: 'cod',
        idempotencyKey: 'idem-test-001',
        address: {
          fullName: 'Test User',
          phone: '9876543210',
          line1: 'House 1',
          city: 'Alwar',
          state: 'Rajasthan',
          postalCode: '301030',
          country: 'IN',
        },
      });
    expect(order.status).toBe(201);
    expect(order.body.data.paymentMethod).toBe('cod');
    expect(order.body.data.status).toBe('placed');
  });

  it('rejects admin routes without auth', async () => {
    const { agent, token } = await csrfAgent();
    const res = await agent.get('/api/v1/admin/dashboard').set('x-csrf-token', token);
    expect(res.status).toBe(401);
  });

  it('allows admin login and dashboard', async () => {
    const { agent, token } = await csrfAgent();
    const login = await agent
      .post('/api/v1/auth/admin/login')
      .set('x-csrf-token', token)
      .send({ email: 'admin@test.local', password: 'Admin1234' });
    expect(login.status).toBe(200);
    const csrf = login.body.data.csrfToken as string;
    const dash = await agent.get('/api/v1/admin/dashboard').set('x-csrf-token', csrf);
    expect(dash.status).toBe(200);
    expect(dash.body.data.totalOrders).toBeGreaterThanOrEqual(0);
  });

  it('creates and updates a product with variants and label info', async () => {
    const { agent, token } = await csrfAgent();
    const login = await agent
      .post('/api/v1/auth/admin/login')
      .set('x-csrf-token', token)
      .send({ email: 'admin@test.local', password: 'Admin1234' });
    const csrf = login.body.data.csrfToken as string;
    const cat = await agent.get('/api/v1/admin/categories').set('x-csrf-token', csrf);
    const categoryId = cat.body.data[0].id as string;

    const create = await agent
      .post('/api/v1/admin/products')
      .set('x-csrf-token', csrf)
      .send({
        nameEn: 'Cumin Powder',
        nameHi: 'जीरा पाउडर',
        slug: 'cumin-powder',
        brandName: 'SIMMI MASALA',
        categoryId,
        shortDescription: 'Aromatic cumin powder',
        description: 'Full description for cumin powder used in Indian cooking.',
        status: 'active',
        isFeatured: false,
        images: [{ url: 'https://placehold.co/400x400', alt: 'Cumin placeholder', sortOrder: 0 }],
        labelInfo: {
          ingredients: 'Cumin seeds',
          storageInstructions: 'Store in a cool dry place',
          countryOfOrigin: 'India',
          fssaiLicenseNumber: '',
          fssaiVerified: false,
        },
        variants: [
          {
            sku: 'SM-JEERA-100G',
            packWeightGrams: 100,
            pricePaise: 9000,
            stockQuantity: 20,
            lowStockThreshold: 5,
            isActive: true,
          },
          {
            sku: 'SM-JEERA-250G',
            packWeightGrams: 250,
            pricePaise: 20000,
            stockQuantity: 15,
            lowStockThreshold: 5,
            isActive: true,
          },
        ],
      });
    expect(create.status).toBe(201);
    expect(create.body.data.shortDescription).toBe('Aromatic cumin powder');
    expect(create.body.data.variants).toHaveLength(2);
    expect(create.body.data.labelInfo.ingredients).toBe('Cumin seeds');

    const id = create.body.data.id as string;
    const update = await agent
      .patch(`/api/v1/admin/products/${id}`)
      .set('x-csrf-token', csrf)
      .send({
        shortDescription: 'Updated cumin short description',
        variants: [
          {
            id: create.body.data.variants[0].id,
            sku: 'SM-JEERA-100G',
            packWeightGrams: 100,
            pricePaise: 9500,
            stockQuantity: 18,
            lowStockThreshold: 5,
            isActive: true,
          },
          {
            id: create.body.data.variants[1].id,
            sku: 'SM-JEERA-250G',
            packWeightGrams: 250,
            pricePaise: 20000,
            stockQuantity: 15,
            lowStockThreshold: 5,
            isActive: true,
          },
          {
            sku: 'SM-JEERA-500G',
            packWeightGrams: 500,
            pricePaise: 36000,
            stockQuantity: 8,
            lowStockThreshold: 3,
            isActive: true,
          },
        ],
      });
    expect(update.status).toBe(200);
    expect(update.body.data.shortDescription).toBe('Updated cumin short description');
    expect(update.body.data.variants).toHaveLength(3);

    const dup = await agent
      .post('/api/v1/admin/products')
      .set('x-csrf-token', csrf)
      .send({
        nameEn: 'Dup',
        nameHi: 'डुप',
        slug: 'dup-product',
        categoryId,
        shortDescription: 'dup',
        description: 'Duplicate SKU should fail validation on the server.',
        status: 'draft',
        variants: [
          {
            sku: 'SM-JEERA-100G',
            packWeightGrams: 100,
            pricePaise: 1000,
            stockQuantity: 1,
            lowStockThreshold: 1,
            isActive: true,
          },
        ],
      });
    expect(dup.status).toBe(409);

    const publicProduct = await agent.get('/api/v1/products/cumin-powder');
    expect(publicProduct.status).toBe(200);
    expect(publicProduct.body.data.product.shortDescription).toBe('Updated cumin short description');
    expect(publicProduct.body.data.product.labelInfo.ingredients).toBe('Cumin seeds');
    expect(publicProduct.body.data.product.labelInfo.fssaiLicenseNumber).toBeUndefined();
  });

  it('manages categories, content publish, and customer notes', async () => {
    const { agent, token } = await csrfAgent();
    const login = await agent
      .post('/api/v1/auth/admin/login')
      .set('x-csrf-token', token)
      .send({ email: 'admin@test.local', password: 'Admin1234' });
    const csrf = login.body.data.csrfToken as string;

    const createCat = await agent
      .post('/api/v1/admin/categories')
      .set('x-csrf-token', csrf)
      .send({
        nameEn: 'Turmeric',
        nameHi: 'हल्दी',
        slug: 'turmeric',
        description: 'Turmeric category',
        sortOrder: 1,
      });
    expect(createCat.status).toBe(201);
    const catId = createCat.body.data.id as string;

    const patchCat = await agent
      .patch(`/api/v1/admin/categories/${catId}`)
      .set('x-csrf-token', csrf)
      .send({ isActive: true, sortOrder: 2 });
    expect(patchCat.status).toBe(200);
    expect(patchCat.body.data.sortOrder).toBe(2);

    const content = await agent
      .put('/api/v1/admin/content/home.hero')
      .set('x-csrf-token', csrf)
      .send({
        title: 'Home hero',
        status: 'published',
        blocks: { heading: 'Simmi Masala', tagline: 'हर रसोई की पहचान' },
      });
    expect(content.status).toBe(200);

    const publicContent = await agent.get('/api/v1/content/home.hero');
    expect(publicContent.status).toBe(200);
    expect(publicContent.body.data.blocks.heading).toBe('Simmi Masala');

    const draft = await agent
      .put('/api/v1/admin/content/about.draft-only')
      .set('x-csrf-token', csrf)
      .send({
        title: 'Draft about',
        status: 'draft',
        blocks: { body: 'Not public yet' },
      });
    expect(draft.status).toBe(200);
    const hidden = await agent.get('/api/v1/content/about.draft-only');
    expect(hidden.status).toBe(404);

    const buyers = await agent.get('/api/v1/admin/customers').set('x-csrf-token', csrf);
    expect(buyers.status).toBe(200);
    const buyerId = buyers.body.data.items[0]?.id as string | undefined;
    if (buyerId) {
      const note = await agent
        .patch(`/api/v1/admin/customers/${buyerId}`)
        .set('x-csrf-token', csrf)
        .send({ supportNotes: 'Called about delivery window' });
      expect(note.status).toBe(200);
      expect(note.body.data.supportNotes).toContain('delivery');
    }

    const audit = await agent.get('/api/v1/admin/audit-logs').set('x-csrf-token', csrf);
    expect(audit.status).toBe(200);
    expect(audit.body.data.items.length).toBeGreaterThan(0);
  });

  it('rejects product create with duplicate pack sizes', async () => {
    const { agent, token } = await csrfAgent();
    const login = await agent
      .post('/api/v1/auth/admin/login')
      .set('x-csrf-token', token)
      .send({ email: 'admin@test.local', password: 'Admin1234' });
    const csrf = login.body.data.csrfToken as string;
    const cat = await agent.get('/api/v1/admin/categories').set('x-csrf-token', csrf);
    const categoryId = cat.body.data[0].id as string;
    const res = await agent
      .post('/api/v1/admin/products')
      .set('x-csrf-token', csrf)
      .send({
        nameEn: 'Bad Packs',
        nameHi: 'बैड',
        slug: 'bad-packs',
        categoryId,
        description: 'Should fail because pack sizes are duplicated.',
        status: 'draft',
        variants: [
          {
            sku: 'BAD-100A',
            packWeightGrams: 100,
            pricePaise: 1000,
            stockQuantity: 1,
            lowStockThreshold: 1,
            isActive: true,
          },
          {
            sku: 'BAD-100B',
            packWeightGrams: 100,
            pricePaise: 1200,
            stockQuantity: 1,
            lowStockThreshold: 1,
            isActive: true,
          },
        ],
      });
    expect(res.status).toBe(400);
  });
});
