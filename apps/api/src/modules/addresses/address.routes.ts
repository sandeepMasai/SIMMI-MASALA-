import { Router } from 'express';
import { addressSchema } from '@simmi/shared';
import { z } from 'zod';
import { asyncHandler } from '../../utils/async-handler.js';
import { validateRequest } from '../../middleware/validate-request.js';
import { authenticateCustomer } from '../../middleware/authenticate.js';
import { sendSuccess } from '../../utils/response.js';
import { AddressModel } from './address.model.js';
import { AppError } from '../../utils/errors.js';

export const addressRouter: import("express").Router = Router();
addressRouter.use(authenticateCustomer);

addressRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const docs = await AddressModel.find({ userId: req.user!.id }).sort({ isDefault: -1, createdAt: -1 });
    sendSuccess(
      res,
      docs.map((a) => ({
        id: a._id.toString(),
        label: a.label,
        fullName: a.fullName,
        phone: a.phone,
        line1: a.line1,
        line2: a.line2,
        city: a.city,
        state: a.state,
        postalCode: a.postalCode,
        country: a.country,
        isDefault: a.isDefault,
      })),
    );
  }),
);

addressRouter.post(
  '/',
  validateRequest({ body: addressSchema }),
  asyncHandler(async (req, res) => {
    if (req.body.isDefault) {
      await AddressModel.updateMany({ userId: req.user!.id }, { $set: { isDefault: false } });
    }
    const doc = await AddressModel.create({ ...req.body, userId: req.user!.id });
    sendSuccess(res, { id: doc._id.toString(), ...req.body }, 201);
  }),
);

addressRouter.patch(
  '/:id',
  validateRequest({ params: z.object({ id: z.string() }), body: addressSchema.partial() }),
  asyncHandler(async (req, res) => {
    const doc = await AddressModel.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!doc) throw new AppError('NOT_FOUND', 'Address not found', 404);
    if (req.body.isDefault) {
      await AddressModel.updateMany({ userId: req.user!.id }, { $set: { isDefault: false } });
    }
    Object.assign(doc, req.body);
    await doc.save();
    sendSuccess(res, { id: doc._id.toString() });
  }),
);

addressRouter.delete(
  '/:id',
  validateRequest({ params: z.object({ id: z.string() }) }),
  asyncHandler(async (req, res) => {
    const result = await AddressModel.deleteOne({ _id: req.params.id, userId: req.user!.id });
    if (!result.deletedCount) throw new AppError('NOT_FOUND', 'Address not found', 404);
    sendSuccess(res, { ok: true });
  }),
);
