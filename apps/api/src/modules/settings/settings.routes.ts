import { Router } from 'express';
import { asyncHandler } from '../../utils/async-handler.js';
import { sendSuccess } from '../../utils/response.js';
import { getOrCreateSettings, mapSettings } from './settings.service.js';

export const settingsPublicRouter: import("express").Router = Router();

settingsPublicRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const doc = await getOrCreateSettings();
    sendSuccess(res, mapSettings(doc));
  }),
);
