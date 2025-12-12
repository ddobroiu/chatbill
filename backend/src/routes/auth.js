const express = require('express');
const router = express.Router();
const { z } = require('zod');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { validateBody, validateQuery } = require('../middleware/validate');
const {
  registerSchema,
  loginSchema,
  requestResetSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  emailSchema,
  passwordSchema
} = require('../validation/schemas');
const {
  registerLimiter,
  loginLimiter,
  passwordResetLimiter,
  authLimiter
} = require('../middleware/rateLimiter');

// Rute publice
router.post('/register', registerLimiter, validateBody(registerSchema), authController.register);
router.post('/login', loginLimiter, validateBody(loginSchema), authController.login);
router.post('/forgot-password', passwordResetLimiter, validateBody(requestResetSchema), authController.forgotPassword);
router.post('/reset-password', passwordResetLimiter, validateBody(resetPasswordSchema), authController.resetPassword);
router.get('/verify-email', authLimiter, validateQuery(verifyEmailSchema), authController.verifyEmail);
router.post('/resend-verification', authLimiter, validateBody(z.object({ email: emailSchema })), authController.resendVerification);
router.post('/verify-email-code', authLimiter, validateBody(z.object({
  email: emailSchema,
  code: z.string().length(6, 'Codul trebuie să aibă 6 cifre')
})), authController.verifyEmailCode);
router.post('/resend-verification-code', authLimiter, validateBody(z.object({ email: emailSchema })), authController.resendEmailVerificationCode);

// Rute protejate (necesită autentificare)
router.get('/me', authenticateToken, authController.getCurrentUser);
router.post('/verify-phone', authenticateToken, authController.verifyPhone);
router.post('/resend-phone-code', authenticateToken, authController.resendPhoneCode);
router.put('/profile', authenticateToken, validateBody(z.object({
  email: emailSchema.optional(),
  name: z.string().min(1).optional()
})), authController.updateProfile);
router.post('/change-password', authenticateToken, validateBody(z.object({
  currentPassword: z.string().min(1, 'Parola curentă este obligatorie'),
  newPassword: passwordSchema,
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Parolele nu se potrivesc',
  path: ['confirmPassword']
})), authController.changePassword);

module.exports = router;
