import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import swaggerUi from 'swagger-ui-express';
import { corsOrigins, env } from './config/env.js';
import { requestId } from './middleware/request-id.js';
import { errorHandler } from './middleware/error-handler.js';
import { generalRateLimit } from './middleware/rate-limit.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { productRouter } from './modules/products/product.routes.js';
import { cartRouter } from './modules/cart/cart.routes.js';
import { orderRouter } from './modules/orders/order.routes.js';
import { paymentRouter } from './modules/payments/payment.routes.js';
import { addressRouter } from './modules/addresses/address.routes.js';
import { settingsPublicRouter } from './modules/settings/settings.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { openApiDocument } from './openapi.js';
import mongoose from 'mongoose';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(requestId);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: corsOrigins(),
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(cookieParser());

  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(generalRateLimit);

  app.use('/uploads', express.static(path.resolve(process.cwd(), env.LOCAL_UPLOAD_DIR)));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'simmi-api' });
  });

  app.get('/ready', (_req, res) => {
    const ready = mongoose.connection.readyState === 1;
    res.status(ready ? 200 : 503).json({ ready, mongo: ready });
  });

  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.get('/api/v1/openapi.json', (_req, res) => res.json(openApiDocument));

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/products', productRouter);
  app.use('/api/v1/cart', cartRouter);
  app.use('/api/v1/orders', orderRouter);
  app.use('/api/v1/payments', paymentRouter);
  app.use('/api/v1/addresses', addressRouter);
  app.use('/api/v1/settings', settingsPublicRouter);
  app.use('/api/v1/admin', adminRouter);

  app.get('/api/v1/content/:key', async (req, res, next) => {
    try {
      const { ContentModel } = await import('./modules/content/content.model.js');
      const doc = await ContentModel.findOne({ key: req.params.key, status: 'published' });
      if (!doc) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Content not found' },
        });
        return;
      }
      res.json({
        success: true,
        data: {
          key: doc.key,
          title: doc.title,
          blocks: doc.blocks,
          publishedAt: doc.publishedAt?.toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/v1/categories', async (req, res, next) => {
    try {
      const { CategoryModel } = await import('./modules/categories/category.model.js');
      const cats = await CategoryModel.find({ isActive: true }).sort({ nameEn: 1 });
      res.json({
        success: true,
        data: cats.map((c) => ({
          id: c._id.toString(),
          nameEn: c.nameEn,
          nameHi: c.nameHi,
          slug: c.slug,
          description: c.description,
        })),
      });
    } catch (err) {
      next(err);
    }
  });

  app.use(errorHandler);
  return app;
}
