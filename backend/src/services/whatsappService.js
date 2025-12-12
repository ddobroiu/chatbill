/**
 * WhatsApp Service - Trimitere mesaje și coduri de verificare
 * Folosește Meta WhatsApp Business API (același ca pentru conversații)
 */

const axios = require('axios');

// Meta WhatsApp Business API Configuration (same as whatsappController)
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v24.0';
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID;
const WHATSAPP_TOKEN = process.env.META_API_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN;

/**
 * Trimite cod de verificare pe WhatsApp folosind Meta Business API
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
    if (process.env.NODE_ENV === 'development' && !WHATSAPP_PHONE_ID) {
      console.log('⚠️ DEVELOPMENT MODE - Cod WhatsApp:', code);
      console.log('📱 Număr destinatar:', formattedPhone);
      console.log('💬 Mesaj:', message);
      return {
        success: true,
        message: 'Cod logat în consolă (development mode)',
        code // Returnăm codul în development pentru testing
      };
    }

    // Verificăm dacă avem configurarea Meta WhatsApp
    if (!WHATSAPP_PHONE_ID || !WHATSAPP_TOKEN) {
      throw new Error('WhatsApp API nu este configurat (lipsesc WHATSAPP_PHONE_ID sau META_API_TOKEN)');
    }

    // Trimite prin Meta WhatsApp Business API
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: {
          body: message
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Cod WhatsApp trimis cu succes prin Meta API');
    return {
      success: true,
      messageId: response.data.messages[0].id
    };

  } catch (error) {
    console.error('❌ Eroare trimitere WhatsApp:', error.response?.data || error.message);
    
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
