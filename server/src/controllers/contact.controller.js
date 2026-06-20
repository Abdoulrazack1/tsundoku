'use strict';

const asyncHandler = require('../utils/asyncHandler');
const contactModel = require('../models/contact.model');
const logger = require('../config/logger');
const { escapeHtml } = require('../utils/sanitize');
const { AppError } = require('../middlewares/error.middleware');

const send = asyncHandler(async (req, res) => {
  if (req.body.website) return res.status(201).json({ message: 'Merci ! Ton message a bien été envoyé.' }); // honeypot
  const { name, email, subject, message } = req.body;
  await contactModel.create({
    name: escapeHtml(name.trim()),
    email: email.trim(),
    subject: subject ? escapeHtml(subject.trim()) : null,
    message: escapeHtml(message.trim()),
  });
  logger.info(`[contact] Message de ${email}`);
  res.status(201).json({ message: 'Merci ! Ton message a bien été envoyé.' });
});

const list = asyncHandler(async (req, res) => {
  res.json({ messages: await contactModel.list() });
});
const markRead = asyncHandler(async (req, res) => {
  await contactModel.markRead(Number(req.params.id));
  res.json({ ok: true });
});
const remove = asyncHandler(async (req, res) => {
  const ok = await contactModel.remove(Number(req.params.id));
  if (!ok) throw new AppError('Message introuvable.', 404);
  res.json({ message: 'Message supprimé.' });
});

module.exports = { send, list, markRead, remove };
