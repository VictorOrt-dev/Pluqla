/**
 * IP Deduplication Service
 *
 * Service pour hasher les adresses IP avec un salt sécurisé
 * Utilisé pour le rate limiting et la détection de fraude sans stocker les IP réelles
 * Conforme RGPD: pas de stockage d'IP brutes
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

// Salt récupéré depuis les variables d'environnement
const IP_SALT = process.env.IP_SALT || 'default-salt-change-in-production';

if (IP_SALT === 'default-salt-change-in-production') {
  logger.warn('⚠️  IP_SALT utilise la valeur par défaut! Configurez IP_SALT en production.');
}

/**
 * Hash une adresse IP avec SHA256 + salt
 * @param {string} ipAddress - Adresse IP brute (IPv4 ou IPv6)
 * @returns {string} Hash SHA256 (64 caractères hex)
 */
function hashIP(ipAddress) {
  if (!ipAddress) {
    throw new Error('IP address is required');
  }

  // Nettoyer l'IP (enlever ::ffff: prefix pour IPv4-mapped IPv6)
  const cleanIP = ipAddress.replace(/^::ffff:/, '');

  // Hash SHA256 avec salt
  const hash = crypto
    .createHash('sha256')
    .update(`${cleanIP}${IP_SALT}`)
    .digest('hex');

  return hash;
}

/**
 * Extrait l'IP réelle depuis la requête Express
 * Gère les proxies (X-Forwarded-For, X-Real-IP)
 *
 * @param {Object} req - Objet request Express
 * @returns {string} Adresse IP réelle
 */
function extractRealIP(req) {
  // Ordre de priorité pour détecter l'IP réelle:
  // 1. X-Real-IP (Nginx proxy)
  // 2. X-Forwarded-For (standard proxy, première IP de la liste)
  // 3. req.ip (Express direct)
  // 4. req.connection.remoteAddress (fallback)

  let ip = req.headers['x-real-ip']
    || (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.ip
    || req.connection?.remoteAddress
    || 'unknown';

  // Nettoyer les préfixes IPv6
  ip = ip.replace(/^::ffff:/, '');

  return ip;
}

/**
 * Hash l'IP de la requête Express
 * Fonction utilitaire combinant extraction + hash
 *
 * @param {Object} req - Objet request Express
 * @returns {string} Hash SHA256 de l'IP
 */
function hashRequestIP(req) {
  const realIP = extractRealIP(req);
  return hashIP(realIP);
}

/**
 * Vérifie si un hash IP existe dans un tableau
 * Utile pour les listes noires/blanches
 *
 * @param {string} ipHash - Hash SHA256 de l'IP
 * @param {Array<string>} hashList - Liste de hash à vérifier
 * @returns {boolean} True si le hash est dans la liste
 */
function isIPInList(ipHash, hashList) {
  if (!Array.isArray(hashList)) {
    return false;
  }
  return hashList.includes(ipHash);
}

/**
 * Génère un identifiant unique combinant IP + User-Agent
 * Utile pour identifier un "device" sans stocker les données brutes
 *
 * @param {Object} req - Objet request Express
 * @returns {string} Hash SHA256 (IP + User-Agent)
 */
function generateDeviceFingerprint(req) {
  const realIP = extractRealIP(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  const fingerprint = crypto
    .createHash('sha256')
    .update(`${realIP}${userAgent}${IP_SALT}`)
    .digest('hex');

  return fingerprint;
}

/**
 * Valide le format d'une adresse IP (IPv4 ou IPv6)
 *
 * @param {string} ip - Adresse IP à valider
 * @returns {boolean} True si l'IP est valide
 */
function isValidIP(ip) {
  if (!ip || typeof ip !== 'string') {
    return false;
  }

  // IPv4 regex
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;

  // IPv6 regex (simplifié)
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}$/;

  const cleanIP = ip.replace(/^::ffff:/, '');

  if (ipv4Regex.test(cleanIP)) {
    // Valider que chaque octet est entre 0-255
    const octets = cleanIP.split('.');
    return octets.every(octet => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    });
  }

  return ipv6Regex.test(cleanIP);
}

/**
 * Middleware Express pour ajouter ipHash à req
 * Usage: app.use(attachIPHash)
 *
 * @param {Object} req - Request Express
 * @param {Object} res - Response Express
 * @param {Function} next - Next middleware
 */
function attachIPHash(req, res, next) {
  try {
    req.ipHash = hashRequestIP(req);
    req.realIP = extractRealIP(req);
    req.deviceFingerprint = generateDeviceFingerprint(req);
    next();
  } catch (error) {
    logger.error('Failed to attach IP hash to request', {
      error: error.message,
      path: req.path
    });
    // Continue malgré l'erreur (dégradation gracieuse)
    req.ipHash = 'error-hash';
    req.realIP = 'unknown';
    req.deviceFingerprint = 'error-fingerprint';
    next();
  }
}

/**
 * Obtenir des statistiques sur l'utilisation du service
 * Utile pour monitoring
 *
 * @returns {Object} Statistiques
 */
function getStats() {
  return {
    saltConfigured: IP_SALT !== 'default-salt-change-in-production',
    saltLength: IP_SALT.length,
    hashAlgorithm: 'SHA256',
    version: '1.0.0'
  };
}

module.exports = {
  hashIP,
  extractRealIP,
  hashRequestIP,
  isIPInList,
  generateDeviceFingerprint,
  isValidIP,
  attachIPHash,
  getStats
};
