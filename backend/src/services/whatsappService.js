/**
 * WhatsApp Service - Trimitere mesaje și coduri de verificare
 * Folosește API-ul WhatsApp Business (sau provider ca Twilio/MessageBird)
 */

const axios = require('axios');

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || '';
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN || '';
const WHATSAPP_FROM_NUMBER = process.env.WHATSAPP_FROM_NUMBER || '';

/**
 * Trimite cod de verificare pe WhatsApp
 * @param {string} phoneNumber - Număr telefon destinatar (format: +40721234567)
 * @param {string} code - Codul de verificare de 6 cifre
 */
async function sendVerificationCode(phoneNumber, code) {
  try {
    // Formatează numărul de telefon
    let formattedPhone = phoneNumber.trim();
    
    // Adaugă prefix +40 dacă lipsește
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+4' + formattedPhone;
      } else {
        formattedPhone = '+40' + formattedPhone;
      }
    }

    const message = `✅ ChatBill - Codul tău de verificare este: ${code}\n\nCodul este valabil 15 minute.\n\nDacă nu ai solicitat acest cod, ignoră mesajul.`;

    console.log(`📱 Trimitere cod WhatsApp către ${formattedPhone}`);

    // În development, doar logăm codul (nu trimitem pe WhatsApp)
    if (process.env.NODE_ENV === 'development' || !WHATSAPP_API_URL) {
      console.log('⚠️ DEVELOPMENT MODE - Cod WhatsApp:', code);
      console.log('📱 Număr destinatar:', formattedPhone);
      console.log('💬 Mesaj:', message);
      return {
        success: true,
        message: 'Cod logat în consolă (development mode)',
        code // Returnăm codul în development pentru testing
      };
    }

    // În production, trimitem prin API WhatsApp
    // Exemplu cu Twilio WhatsApp API
    if (WHATSAPP_API_URL.includes('twilio')) {
      const response = await axios.post(
        WHATSAPP_API_URL,
        {
          From: `whatsapp:${WHATSAPP_FROM_NUMBER}`,
          To: `whatsapp:${formattedPhone}`,
          Body: message
        },
        {
          auth: {
            username: process.env.TWILIO_ACCOUNT_SID || '',
            password: WHATSAPP_API_TOKEN
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      console.log('✅ Cod WhatsApp trimis cu succes');
      return {
        success: true,
        messageId: response.data.sid
      };
    }

    // Exemplu generic pentru alte providere
    const response = await axios.post(
      WHATSAPP_API_URL,
      {
        to: formattedPhone,
        message: message
      },
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Cod WhatsApp trimis cu succes');
    return {
      success: true,
      messageId: response.data.id || response.data.messageId
    };

  } catch (error) {
    console.error('❌ Eroare trimitere WhatsApp:', error.message);
    
    // În development, nu aruncăm eroare
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ Cod WhatsApp (failsafe):', code);
      return {
        success: true,
        message: 'Development mode - cod afișat în consolă'
      };
    }

    throw new Error('Eroare la trimiterea codului WhatsApp');
  }
}

/**
 * Trimite mesaj generic pe WhatsApp
 * @param {string} phoneNumber - Număr telefon destinatar
 * @param {string} message - Mesajul de trimis
 */
async function sendMessage(phoneNumber, message) {
  try {
    let formattedPhone = phoneNumber.trim();
    
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+4' + formattedPhone;
      } else {
        formattedPhone = '+40' + formattedPhone;
      }
    }

    console.log(`📱 Trimitere mesaj WhatsApp către ${formattedPhone}`);

    if (process.env.NODE_ENV === 'development' || !WHATSAPP_API_URL) {
      console.log('⚠️ DEVELOPMENT MODE - Mesaj WhatsApp:', message);
      return { success: true, message: 'Mesaj logat în consolă (development mode)' };
    }

    const response = await axios.post(
      WHATSAPP_API_URL,
      {
        to: formattedPhone,
        message: message
      },
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Mesaj WhatsApp trimis cu succes');
    return {
      success: true,
      messageId: response.data.id || response.data.messageId
    };

  } catch (error) {
    console.error('❌ Eroare trimitere WhatsApp:', error.message);
    
    if (process.env.NODE_ENV === 'development') {
      return { success: true, message: 'Development mode' };
    }

    throw new Error('Eroare la trimiterea mesajului WhatsApp');
  }
}

module.exports = {
  sendVerificationCode,
  sendMessage
};
