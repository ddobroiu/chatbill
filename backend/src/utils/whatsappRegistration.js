const bcrypt = require('bcrypt');
const prisma = require('../db/prismaWrapper');
const { generateVerificationCode, getCodeExpiry } = require('./phoneVerification');

/**
 * Inițiază procesul de înregistrare prin WhatsApp
 * Creează o înregistrare temporară în sesiunea de chat
 */
async function startWhatsAppRegistration(phoneNumber, sessionId) {
  // Verifică dacă numărul este deja înregistrat
  const existingUser = await prisma.user.findFirst({
    where: {
      phone: phoneNumber,
      phoneVerified: true
    }
  });

  if (existingUser) {
    return {
      success: false,
      error: 'Acest număr de telefon este deja înregistrat. Scrie "login" pentru a te autentifica.'
    };
  }

  // Actualizează sesiunea cu flag de înregistrare
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: {
      metadata: JSON.stringify({
        registrationInProgress: true,
        registrationStep: 'email',
        registrationData: {
          phone: phoneNumber
        }
      })
    }
  });

  return {
    success: true,
    nextStep: 'email'
  };
}

/**
 * Procesează pasul de înregistrare bazat pe starea curentă
 */
async function processRegistrationStep(session, userInput) {
  const metadata = session.metadata ? JSON.parse(session.metadata) : {};
  const registrationData = metadata.registrationData || {};
  const currentStep = metadata.registrationStep;

  switch (currentStep) {
    case 'email':
      // Validează email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userInput)) {
        return {
          success: false,
          message: '❌ Email invalid. Te rog să introduci un email valid (ex: nume@exemplu.com)',
          nextStep: 'email'
        };
      }

      // Verifică dacă email-ul este deja folosit
      const existingEmail = await prisma.user.findUnique({
        where: { email: userInput.toLowerCase() }
      });

      if (existingEmail) {
        return {
          success: false,
          message: '❌ Acest email este deja înregistrat. Scrie "login" pentru a te autentifica.',
          nextStep: 'email'
        };
      }

      registrationData.email = userInput.toLowerCase();
      return {
        success: true,
        message: '✅ Email salvat!\n\nAcum, cum te cheamă? (ex: Ion Popescu)',
        nextStep: 'name',
        registrationData
      };

    case 'name':
      if (userInput.length < 3) {
        return {
          success: false,
          message: '❌ Numele trebuie să aibă cel puțin 3 caractere.',
          nextStep: 'name'
        };
      }

      registrationData.name = userInput;
      return {
        success: true,
        message: '✅ Nume salvat!\n\nCreează o parolă pentru contul tău (minim 6 caractere):',
        nextStep: 'password',
        registrationData
      };

    case 'password':
      if (userInput.length < 6) {
        return {
          success: false,
          message: '❌ Parola trebuie să aibă minim 6 caractere.',
          nextStep: 'password'
        };
      }

      registrationData.password = userInput;
      return {
        success: true,
        message: '✅ Parolă salvată!\n\nGata! Acum creez contul tău... ⏳',
        nextStep: 'create_account',
        registrationData
      };

    default:
      return {
        success: false,
        message: 'Eroare în procesul de înregistrare. Te rog să reîncepi scriind "cont nou".',
        nextStep: null
      };
  }
}

/**
 * Creează contul efectiv după ce toate datele au fost colectate
 */
async function createWhatsAppAccount(registrationData) {
  try {
    // Hash-uiește parola
    const hashedPassword = await bcrypt.hash(registrationData.password, 10);

    // Generează cod de verificare (opțional pentru logging)
    const verificationCode = generateVerificationCode();

    // Creează utilizatorul
    const user = await prisma.user.create({
      data: {
        email: registrationData.email,
        name: registrationData.name,
        password: hashedPassword,
        phone: registrationData.phone,
        phoneVerified: true, // IMPORTANT: Verificat automat prin WhatsApp
        phoneVerificationCode: null,
        phoneVerificationExpiry: null,
        emailVerified: false, // Email-ul poate fi verificat mai târziu
        role: 'user'
      }
    });

    console.log(`✅ Cont nou creat prin WhatsApp: ${user.email} (${user.phone})`);

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone
      }
    };

  } catch (error) {
    console.error('❌ Eroare creare cont WhatsApp:', error);
    return {
      success: false,
      error: 'Eroare la crearea contului. Te rugăm să încerci din nou mai târziu.'
    };
  }
}

module.exports = {
  startWhatsAppRegistration,
  processRegistrationStep,
  createWhatsAppAccount
};
