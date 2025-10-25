/**
 * CACHE HEADERS MIDDLEWARE
 * Configure optimal caching strategies for different asset types
 *
 * Stratégie de cache :
 * - Assets statiques (JS, CSS, images) : Cache agressif avec fingerprinting
 * - HTML : Pas de cache (pour revalidation)
 * - API : Pas de cache
 */

/**
 * Set cache headers based on content type and file path
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function setCacheHeaders(req, res, next) {
  const path = req.path;

  // 1. Assets statiques avec fingerprinting (JS, CSS avec hash dans le nom)
  // Ex: main.abc123.js, styles.def456.css
  // Cache: 1 an (immutable car versionnés)
  if (/\.(js|css)$/.test(path) && /\.[a-f0-9]{8,}\.(js|css)$/.test(path)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
    return next();
  }

  // 2. Images et fonts avec fingerprinting
  // Cache: 1 an (immutable)
  if (/\.(jpg|jpeg|png|gif|svg|webp|woff|woff2|ttf|eot|otf)$/.test(path)) {
    // Avec hash dans le nom : cache long
    if (/\.[a-f0-9]{8,}\.(jpg|jpeg|png|gif|svg|webp|woff|woff2|ttf|eot|otf)$/.test(path)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      // Sans hash : cache modéré
      res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 jours
    }
    return next();
  }

  // 3. Service Worker
  // Cache: 0 (doit être revalidé à chaque fois)
  if (/service-worker\.js$/.test(path) || /sw\.js$/.test(path)) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return next();
  }

  // 4. HTML files (index.html, etc.)
  // Cache: Revalidation requise
  if (/\.html$/.test(path) || path === '/' || path === '') {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    return next();
  }

  // 5. API endpoints
  // Cache: Désactivé (données dynamiques)
  if (path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return next();
  }

  // 6. Autres assets sans fingerprinting
  // Cache: modéré avec revalidation
  res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate'); // 1 heure
  next();
}

/**
 * Compression middleware configuration
 * Recommend using this with the cache headers
 */
function getCompressionOptions() {
  return {
    level: 6, // Balance entre compression et CPU
    threshold: 1024, // Compresser seulement fichiers > 1KB
    filter: (req, res) => {
      // Ne pas compresser les fichiers déjà compressés
      const contentType = res.getHeader('Content-Type');
      if (!contentType) return true;

      // Compresser text, json, javascript, css, svg
      return /text|json|javascript|css|svg/.test(contentType);
    }
  };
}

/**
 * Security headers to add alongside cache headers
 */
function setSecurityHeaders(req, res, next) {
  // X-Content-Type-Options: prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // X-Frame-Options: prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // X-XSS-Protection: enable XSS filter (legacy browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer-Policy: control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
}

module.exports = {
  setCacheHeaders,
  getCompressionOptions,
  setSecurityHeaders
};
