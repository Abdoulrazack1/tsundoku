'use strict';

const asyncHandler = require('../utils/asyncHandler');
const newsletterModel = require('../models/newsletter.model');
const logger = require('../config/logger');
const { AppError } = require('../middlewares/error.middleware');

const subscribe = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const existing = await newsletterModel.findByEmail(email);
  if (existing && !existing.unsubscribed_at) {
    throw new AppError('Cet email est déjà abonné.', 409, 'ALREADY_SUBSCRIBED');
  }
  const sub = await newsletterModel.subscribe(email);
  // En production : email.service enverrait le lien de confirmation (double opt-in).
  logger.info(`[newsletter] Nouvel abonné : ${email} (token: ${sub.confirm_token?.slice(0, 8)}…)`);
  res.status(201).json({ message: 'Merci ! Un email de confirmation vous a été envoyé.', confirm_token: sub.confirm_token });
});

const confirm = asyncHandler(async (req, res) => {
  const ok = await newsletterModel.confirm(req.params.token);
  if (!ok) throw new AppError('Lien de confirmation invalide ou expiré.', 400);
  res.json({ message: 'Abonnement confirmé. Bienvenue dans la pile.' });
});

const unsubscribe = asyncHandler(async (req, res) => {
  await newsletterModel.unsubscribe(req.body.email);
  res.json({ message: 'Vous êtes désabonné.' });
});

const subscribers = asyncHandler(async (req, res) => {
  res.json({ subscribers: await newsletterModel.list() });
});

module.exports = { subscribe, confirm, unsubscribe, subscribers };
