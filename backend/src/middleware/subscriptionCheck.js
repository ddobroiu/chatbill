const prisma = require('../db/prismaWrapper');

/**
 * Verifică dacă utilizatorul poate emite facturi
 * Condițiile:
 * 1. Utilizatorul trebuie să fie logat
 * 2. Trebuie să aibă datele companiei setate (CompanySettings)
 * 3. Trebuie să fie în perioada de probă (7 zile) SAU să aibă abonament activ
 */
async function checkCanGenerateInvoice(userId) {
  try {
    // 1. Verifică utilizatorul
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        createdAt: true,
        subscriptionStatus: true,
        subscriptionExpiresAt: true
      }
    });

    if (!user) {
      return {
        canGenerate: false,
        reason: 'user_not_found',
        message: 'Utilizator negăsit'
      };
    }

    // 2. Verifică dacă are setările companiei
    const companySettings = await prisma.companySettings.findUnique({
      where: { userId: userId }
    });

    if (!companySettings) {
      return {
        canGenerate: false,
        reason: 'no_company_settings',
        message: '📋 Pentru a emite facturi, trebuie să completezi datele companiei în secțiunea Setări > Date Companie.\n\n🔗 Te poți loga sau crea cont pentru a salva setările tale.',
        requiresAuth: false
      };
    }

    // Verifică dacă datele esențiale sunt completate
    if (!companySettings.name || !companySettings.cui) {
      return {
        canGenerate: false,
        reason: 'incomplete_company_settings',
        message: '⚠️ Datele companiei sunt incomplete. Te rog completează cel puțin:\n• Numele companiei\n• CUI\n\nAccesează Setări > Date Companie pentru a completa.',
        requiresAuth: false
      };
    }

    // 3. Calculează perioada de probă (7 zile de la înregistrare)
    const accountAge = Date.now() - new Date(user.createdAt).getTime();
    const trialPeriodMs = 7 * 24 * 60 * 60 * 1000; // 7 zile în milisecunde
    const inTrialPeriod = accountAge < trialPeriodMs;
    const daysLeft = Math.ceil((trialPeriodMs - accountAge) / (24 * 60 * 60 * 1000));

    // 4. Verifică abonament activ
    const hasActiveSubscription = user.subscriptionStatus === 'active' && 
      (!user.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) > new Date());

    if (inTrialPeriod) {
      return {
        canGenerate: true,
        reason: 'trial_period',
        message: `✅ Perioada de probă: încă ${daysLeft} ${daysLeft === 1 ? 'zi' : 'zile'} rămase`,
        trialDaysLeft: daysLeft,
        inTrial: true
      };
    }

    if (hasActiveSubscription) {
      return {
        canGenerate: true,
        reason: 'active_subscription',
        message: '✅ Abonament activ',
        inTrial: false
      };
    }

    // Nu are nici trial nici abonament
    return {
      canGenerate: false,
      reason: 'subscription_required',
      message: '💳 Perioada de probă a expirat.\n\nPentru a continua să emiti facturi, activează un abonament:\n• Plan Lunar: 4.99 EUR/lună\n• Plan Anual: 49.99 EUR/an (economisești 10 EUR)\n\n🔗 Accesează Abonament din meniu pentru a activa.',
      requiresSubscription: true,
      trialExpired: true
    };

  } catch (error) {
    console.error('❌ Eroare verificare permisiuni:', error);
    return {
      canGenerate: false,
      reason: 'error',
      message: 'Eroare la verificarea permisiunilor'
    };
  }
}

/**
 * Middleware pentru a verifica dacă utilizatorul poate genera facturi
 */
async function requireInvoicePermission(req, res, next) {
  try {
    // Dacă nu e autentificat, continuă (logica va fi gestionată în controller)
    if (!req.user || !req.user.id) {
      return next();
    }

    const check = await checkCanGenerateInvoice(req.user.id);
    
    // Atașează rezultatul la req pentru a fi folosit în controller
    req.invoicePermission = check;
    
    next();
  } catch (error) {
    console.error('❌ Eroare middleware subscription:', error);
    return res.status(500).json({
      success: false,
      error: 'Eroare la verificarea permisiunilor'
    });
  }
}

module.exports = {
  checkCanGenerateInvoice,
  requireInvoicePermission
};
