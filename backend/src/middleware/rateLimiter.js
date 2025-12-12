const rateLimit = require('express-rate-limit');

// Configurare generale pentru rate limiting
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: message || 'Prea multe cereri. Te rugăm să încerci din nou mai târziu.'
    },
    standardHeaders: true, // Return rate limit info in RateLimit-* headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
    // Skip successful requests from count
    skipSuccessfulRequests: false,
    // Skip failed requests from count
    skipFailedRequests: false,
    // Handler called when limit is exceeded
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: message || 'Prea multe cereri. Te rugăm să încerci din nou mai târziu.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Rate limiter pentru autentificare (strict)
// 5 încercări per 15 minute
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5,
  'Prea multe încercări de autentificare. Te rugăm să aștepți 15 minute.'
);

// Rate limiter pentru login (foarte strict)
// 3 încercări per 15 minute
const loginLimiter = createRateLimiter(
  15 * 60 * 1000,
  3,
  'Prea multe încercări de login. Contul tău este temporar blocat pentru 15 minute.'
);

// Rate limiter pentru înregistrare
// 3 conturi noi per oră per IP
const registerLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  3,
  'Prea multe înregistrări. Te rugăm să aștepți 1 oră.'
);

// Rate limiter pentru reset parolă
// 3 cereri per oră
const passwordResetLimiter = createRateLimiter(
  60 * 60 * 1000,
  3,
  'Prea multe cereri de resetare parolă. Te rugăm să aștepți 1 oră.'
);

// Rate limiter pentru API general (moderat)
// 100 cereri per 15 minute
const apiLimiter = createRateLimiter(
  15 * 60 * 1000,
  100,
  'Prea multe cereri API. Te rugăm să reduci frecvența cererilor.'
);

// Rate limiter pentru generare documente (PDF)
// 20 documente per 10 minute (generarea PDF consumă resurse)
const documentGenerationLimiter = createRateLimiter(
  10 * 60 * 1000,
  20,
  'Prea multe documente generate. Te rugăm să aștepți câteva minute.'
);

// Rate limiter pentru webhook-uri (permisiv dar cu protecție)
// 1000 cereri per minut (Stripe poate trimite multe webhook-uri)
const webhookLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  1000,
  'Prea multe webhook-uri. Contactează suportul.'
);

// Rate limiter pentru chat/AI (consumă resurse)
// 30 mesaje per 5 minute
const chatLimiter = createRateLimiter(
  5 * 60 * 1000,
  30,
  'Prea multe mesaje trimise. Te rugăm să aștepți câteva minute.'
);

// Rate limiter pentru auto-complete (căutări externe)
// 20 cereri per minut
const autocompleteLimiter = createRateLimiter(
  60 * 1000,
  20,
  'Prea multe căutări. Te rugăm să reduci frecvența.'
);

// Rate limiter pentru download-uri
// 50 download-uri per 10 minute
const downloadLimiter = createRateLimiter(
  10 * 60 * 1000,
  50,
  'Prea multe download-uri. Te rugăm să aștepți câteva minute.'
);

module.exports = {
  authLimiter,
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  apiLimiter,
  documentGenerationLimiter,
  webhookLimiter,
  chatLimiter,
  autocompleteLimiter,
  downloadLimiter,
  createRateLimiter
};
