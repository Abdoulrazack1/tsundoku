'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userModel = require('../models/user.model');
const { AppError } = require('../middlewares/error.middleware');

const BCRYPT_COST = 12;

function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_COST);
}

function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, username: user.username },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiry }
  );
}

function generateRefreshToken(user) {
  return jwt.sign({ sub: user.id, type: 'refresh' }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiry,
  });
}

/** Inscription d'un membre (rôle 'member') + émission des tokens. */
async function register(username, email, password) {
  if (await userModel.findByEmail(email)) throw new AppError('Un compte existe déjà avec cet email.', 409, 'EMAIL_TAKEN');
  if (await userModel.findByUsername(username)) throw new AppError('Ce nom est déjà pris.', 409, 'USERNAME_TAKEN');
  const passwordHash = await hashPassword(password);
  const user = await userModel.create({ username, email, passwordHash, role: 'member' });
  return {
    user: { id: user.id, username: user.username, email: user.email, role: user.role },
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  };
}

/** Connexion : vérifie les identifiants et émet les deux tokens. */
async function login(email, password) {
  const user = await userModel.findByEmail(email);
  if (!user) throw new AppError('Identifiants invalides.', 401, 'INVALID_CREDENTIALS');

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) throw new AppError('Identifiants invalides.', 401, 'INVALID_CREDENTIALS');

  const safeUser = { id: user.id, username: user.username, email: user.email, role: user.role, avatar_url: user.avatar_url };
  return {
    user: safeUser,
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  };
}

/** Rafraîchit l'access token à partir du refresh token (cookie HttpOnly). */
async function refresh(refreshToken) {
  if (!refreshToken) throw new AppError('Refresh token manquant.', 401);
  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwt.refreshSecret);
  } catch {
    throw new AppError('Refresh token invalide ou expiré.', 401, 'REFRESH_INVALID');
  }
  const user = await userModel.findById(payload.sub);
  if (!user) throw new AppError('Utilisateur introuvable.', 401);
  return { accessToken: generateAccessToken(user), user };
}

module.exports = {
  hashPassword, verifyPassword, generateAccessToken, generateRefreshToken, register, login, refresh,
};
