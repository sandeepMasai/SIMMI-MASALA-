import { Router } from 'express';
import { cartItemInputSchema } from '@simmi/shared';
import { z } from 'zod';
import { asyncHandler } from '../../utils/async-handler.js';
import { validateRequest } from '../../middleware/validate-request.js';
import { optionalCustomer } from '../../middleware/authenticate.js';
import { sendSuccess } from '../../utils/response.js';
import { addCartItem, getCartDto, removeCartItem, updateCartItem } from './cart.service.js';
import { assertCsrf } from '../auth/session.js';

export const cartRouter: import("express").Router = Router();

function guestKey(req: { headers: Record<string, unknown> }) {
  return (req.headers['x-guest-cart-key'] as string | undefined) || undefined;
}

cartRouter.use(optionalCustomer);

cartRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const cart = await getCartDto(req.user?.id, guestKey(req));
    sendSuccess(res, cart);
  }),
);

cartRouter.post(
  '/items',
  validateRequest({ body: cartItemInputSchema }),
  asyncHandler(async (req, res) => {
    assertCsrf(req);
    const cart = await addCartItem(req.body, req.user?.id, guestKey(req));
    sendSuccess(res, cart, 201);
  }),
);

cartRouter.patch(
  '/items/:itemId',
  validateRequest({
    params: z.object({ itemId: z.string() }),
    body: z.object({ quantity: z.number().int().min(0).max(99) }),
  }),
  asyncHandler(async (req, res) => {
    assertCsrf(req);
    const cart = await updateCartItem(
      String(req.params.itemId),
      req.body.quantity,
      req.user?.id,
      guestKey(req),
    );
    sendSuccess(res, cart);
  }),
);

cartRouter.delete(
  '/items/:itemId',
  validateRequest({ params: z.object({ itemId: z.string() }) }),
  asyncHandler(async (req, res) => {
    assertCsrf(req);
    const cart = await removeCartItem(String(req.params.itemId), req.user?.id, guestKey(req));
    sendSuccess(res, cart);
  }),
);
