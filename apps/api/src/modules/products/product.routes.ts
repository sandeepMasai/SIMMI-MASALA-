import { Router } from 'express';
import { z } from 'zod';
import { buildPaginatedResult, paginationQuerySchema } from '@simmi/shared';
import { asyncHandler } from '../../utils/async-handler.js';
import { validateRequest } from '../../middleware/validate-request.js';
import { sendSuccess } from '../../utils/response.js';
import { ProductModel } from './product.model.js';
import { CategoryModel } from '../categories/category.model.js';
import { mapProduct } from './product.mapper.js';
import { AppError } from '../../utils/errors.js';
import { ReviewModel } from '../reviews/review.model.js';

export const productRouter: import("express").Router = Router();

productRouter.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const cats = await CategoryModel.find({ isActive: true }).sort({ nameEn: 1 });
    sendSuccess(
      res,
      cats.map((c) => ({
        id: c._id.toString(),
        nameEn: c.nameEn,
        nameHi: c.nameHi,
        slug: c.slug,
        description: c.description,
      })),
    );
  }),
);

productRouter.get(
  '/',
  validateRequest({
    query: paginationQuerySchema.extend({
      q: z.string().optional(),
      category: z.string().optional(),
      minPrice: z.coerce.number().optional(),
      maxPrice: z.coerce.number().optional(),
      sort: z.enum(['newest', 'price_asc', 'price_desc']).optional(),
      featured: z.coerce.boolean().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const { page, limit, q, category, minPrice, maxPrice, sort, featured } = req.query as unknown as {
      page: number;
      limit: number;
      q?: string;
      category?: string;
      minPrice?: number;
      maxPrice?: number;
      sort?: string;
      featured?: boolean;
    };

    const filter: Record<string, unknown> = { isActive: true, isArchived: false };
    if (q) filter.$text = { $search: q };
    if (featured) filter.isFeatured = true;
    if (category) {
      const cat = await CategoryModel.findOne({ slug: category });
      if (cat) filter.categoryId = cat._id;
    }
    if (minPrice != null || maxPrice != null) {
      filter['variants.pricePaise'] = {
        ...(minPrice != null ? { $gte: minPrice } : {}),
        ...(maxPrice != null ? { $lte: maxPrice } : {}),
      };
    }

    let sortSpec: Record<string, 1 | -1> = { createdAt: -1 };
    if (sort === 'price_asc') sortSpec = { 'variants.pricePaise': 1 };
    if (sort === 'price_desc') sortSpec = { 'variants.pricePaise': -1 };

    const [total, docs] = await Promise.all([
      ProductModel.countDocuments(filter),
      ProductModel.find(filter)
        .sort(sortSpec)
        .skip((page - 1) * limit)
        .limit(limit),
    ]);

    sendSuccess(
      res,
      buildPaginatedResult(
        docs.map((d) => mapProduct(d, { publicView: true })),
        total,
        page,
        limit,
      ),
    );
  }),
);

productRouter.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const doc = await ProductModel.findOne({
      slug: req.params.slug,
      isActive: true,
      isArchived: false,
    });
    if (!doc) throw new AppError('NOT_FOUND', 'Product not found', 404);
    const related = await ProductModel.find({
      categoryId: doc.categoryId,
      _id: { $ne: doc._id },
      isActive: true,
      isArchived: false,
    }).limit(4);
    const reviews = await ReviewModel.find({ productId: doc._id, isPublished: true }).limit(20);
    sendSuccess(res, {
      product: mapProduct(doc, { publicView: true }),
      related: related.map((d) => mapProduct(d, { publicView: true })),
      reviews: reviews.map((r) => ({
        id: r._id.toString(),
        rating: r.rating,
        title: r.title,
        body: r.body,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  }),
);
