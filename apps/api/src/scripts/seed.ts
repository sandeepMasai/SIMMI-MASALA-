import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { CategoryModel } from '../modules/categories/category.model.js';
import { ProductModel } from '../modules/products/product.model.js';
import { StoreSettingsModel } from '../modules/settings/settings.model.js';
import { logger } from '../config/logger.js';

/** DEV PLACEHOLDER prices in paise — not official catalogue prices. */
const PLACEHOLDER = {
  100: 8000,
  250: 18000,
  500: 32000,
} as const;

const PRODUCTS = [
  {
    nameEn: 'Turmeric Powder',
    nameHi: 'हल्दी पाउडर',
    slug: 'turmeric-powder',
    description:
      'DEV PLACEHOLDER DESCRIPTION: Turmeric powder (हल्दी पाउडर). Official product copy, certifications, and images are pending business approval.',
    skuPrefix: 'SM-HALDI',
  },
  {
    nameEn: 'Red Chilli Powder',
    nameHi: 'लाल मिर्च पाउडर',
    slug: 'red-chilli-powder',
    description:
      'DEV PLACEHOLDER DESCRIPTION: Red chilli powder (लाल मिर्च पाउडर). Official product copy, certifications, and images are pending business approval.',
    skuPrefix: 'SM-MIRCH',
  },
  {
    nameEn: 'Coriander Powder',
    nameHi: 'धनिया पाउडर',
    slug: 'coriander-powder',
    description:
      'DEV PLACEHOLDER DESCRIPTION: Coriander powder (धनिया पाउडर). Official product copy, certifications, and images are pending business approval.',
    skuPrefix: 'SM-DHANIA',
  },
];

async function seed() {
  await connectDatabase();
  await StoreSettingsModel.findOneAndUpdate(
    { singletonKey: 'store' },
    { $setOnInsert: { singletonKey: 'store' } },
    { upsert: true, new: true },
  );

  let category = await CategoryModel.findOne({ slug: 'powdered-spices' });
  if (!category) {
    category = await CategoryModel.create({
      nameEn: 'Powdered Spices',
      nameHi: 'पिसे मसाले',
      slug: 'powdered-spices',
      description: 'Ground spice powders',
      sortOrder: 0,
    });
  }

  const spiceCategories = [
    { nameEn: 'Turmeric', nameHi: 'हल्दी', slug: 'turmeric', sortOrder: 1 },
    { nameEn: 'Red Chilli', nameHi: 'लाल मिर्च', slug: 'red-chilli', sortOrder: 2 },
    { nameEn: 'Coriander', nameHi: 'धनिया', slug: 'coriander', sortOrder: 3 },
    { nameEn: 'Garam Masala', nameHi: 'गरम मसाला', slug: 'garam-masala', sortOrder: 4 },
    { nameEn: 'Cumin', nameHi: 'जीरा', slug: 'cumin', sortOrder: 5 },
    { nameEn: 'Black Pepper', nameHi: 'काली मिर्च', slug: 'black-pepper', sortOrder: 6 },
    { nameEn: 'Fennel', nameHi: 'सौंफ', slug: 'fennel', sortOrder: 7 },
    { nameEn: 'Ajwain', nameHi: 'अजवाइन', slug: 'ajwain', sortOrder: 8 },
    { nameEn: 'Fenugreek', nameHi: 'मेथी', slug: 'fenugreek', sortOrder: 9 },
    { nameEn: 'Cardamom', nameHi: 'इलायची', slug: 'cardamom', sortOrder: 10 },
    { nameEn: 'Cloves', nameHi: 'लौंग', slug: 'cloves', sortOrder: 11 },
    { nameEn: 'Cinnamon', nameHi: 'दालचीनी', slug: 'cinnamon', sortOrder: 12 },
    { nameEn: 'Mustard Seeds', nameHi: 'राई', slug: 'mustard-seeds', sortOrder: 13 },
  ] as const;
  for (const c of spiceCategories) {
    await CategoryModel.findOneAndUpdate(
      { slug: c.slug },
      {
        $setOnInsert: {
          nameEn: c.nameEn,
          nameHi: c.nameHi,
          slug: c.slug,
          sortOrder: c.sortOrder,
          isActive: true,
          isArchived: false,
          description: `${c.nameEn} spices`,
        },
      },
      { upsert: true },
    );
  }

  const { ContentModel } = await import('../modules/content/content.model.js');
  await ContentModel.findOneAndUpdate(
    { key: 'home.hero' },
    {
      $setOnInsert: {
        key: 'home.hero',
        title: 'Homepage hero',
        status: 'draft',
        blocks: {
          heading: 'Simmi Masala',
          tagline: 'हर रसोई की पहचान',
          subheading: 'Pure Spices, Pure Life',
          imageUrl: '',
        },
      },
    },
    { upsert: true },
  );
  await ContentModel.findOneAndUpdate(
    { key: 'about' },
    {
      $setOnInsert: {
        key: 'about',
        title: 'About page',
        status: 'draft',
        blocks: {
          heading: 'Simmi Masala',
          tagline: 'हर रसोई की पहचान',
          body: 'SIMMI MASALA is based in Village Salpuri, Alwar, Rajasthan.',
          imageUrl: '',
        },
      },
    },
    { upsert: true },
  );

  // Safe backfill for products created before status / shortDescription existed
  await ProductModel.updateMany(
    { status: { $exists: false }, isArchived: true },
    { $set: { status: 'archived' } },
  );
  await ProductModel.updateMany(
    { status: { $exists: false }, isActive: true },
    { $set: { status: 'active' } },
  );
  await ProductModel.updateMany(
    { status: { $exists: false } },
    { $set: { status: 'draft' } },
  );
  const missingShort = await ProductModel.find({
    $or: [{ shortDescription: { $exists: false } }, { shortDescription: '' }, { shortDescription: null }],
  }).select('description');
  for (const doc of missingShort) {
    doc.shortDescription = (doc.description || '').slice(0, 160);
    await doc.save();
  }

  const featuredIds = [];
  for (const p of PRODUCTS) {
    const existing = await ProductModel.findOne({ slug: p.slug });
    if (existing) {
      featuredIds.push(existing._id);
      continue;
    }
    const product = await ProductModel.create({
      nameEn: p.nameEn,
      nameHi: p.nameHi,
      slug: p.slug,
      brandName: 'SIMMI MASALA',
      shortDescription: `DEV PLACEHOLDER: ${p.nameEn}`,
      description: p.description,
      categoryId: category._id,
      status: 'active',
      isActive: true,
      isFeatured: true,
      isPlaceholderContent: true,
      images: [
        {
          url: `https://placehold.co/800x800/8B1E1E/F5E6C8?text=${encodeURIComponent(p.nameEn)}`,
          alt: `${p.nameEn} — placeholder image (not official product photography)`,
          sortOrder: 0,
        },
      ],
      taxRateBps: 0,
      seoTitle: `${p.nameEn} | SIMMI MASALA (placeholder)`,
      seoDescription: p.description.slice(0, 150),
      labelInfo: {},
      variants: ([100, 250, 500] as const).map((w) => ({
        sku: `${p.skuPrefix}-${w}G`,
        packWeightGrams: w,
        pricePaise: PLACEHOLDER[w],
        compareAtPricePaise: null,
        stockQuantity: 100,
        reservedQuantity: 0,
        lowStockThreshold: 10,
        shippingWeightGrams: w + 20,
        isActive: true,
      })),
    });
    featuredIds.push(product._id);
  }

  await StoreSettingsModel.updateOne(
    { singletonKey: 'store' },
    { $set: { featuredProductIds: featuredIds } },
  );

  logger.info('Seed completed with DEV PLACEHOLDER catalogue data');
  await disconnectDatabase();
}

seed().catch(async (err) => {
  logger.error({ err }, 'Seed failed');
  await disconnectDatabase();
  process.exit(1);
});
