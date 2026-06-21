'use strict';

const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/auth.service');
const userModel = require('../models/user.model');
const env = require('../config/env');
const logger = require('../config/logger');

const REFRESH_COOKIE = 'tsundoku_rt';
const cookieOptions = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
  path: '/api/auth',
};

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.login(email, password);
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
  logger.info(`[auth] Connexion réussie : ${user.email}`);
  res.json({ user, accessToken });
});

const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.register(username, email, password);
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
  logger.info(`[auth] Inscription : ${user.email}`);
  res.status(201).json({ user, accessToken });
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  const { accessToken, user } = await authService.refresh(token);
  res.json({ accessToken, user: { id: user.id, username: user.username, role: user.role } });
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie(REFRESH_COOKIE, { ...cookieOptions, maxAge: undefined });
  res.json({ message: 'Déconnexion réussie.' });
});

const me = asyncHandler(async (req, res) => {
  const user = await userModel.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
  res.json({ user });
});

module.exports = { login, register, refresh, logout, me };
