const prisma = require('../db/prismaWrapper');
const axios = require('axios');
const aiChatController = require('./aiChatController');
const { generateVerificationCode, getCodeExpiry, isCodeValid } = require('../utils/phoneVerification');
const { startWhatsAppRegistration, processRegistrationStep, createWhatsAppAccount } = require('../utils/whatsappRegistration');

// WhatsApp API Configuration
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v24.0';
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID;
const WHATSAPP_TOKEN = process.env.META_API_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN;
const WEBHOOK_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || process.env.WEBHOOK_VERIFY_TOKEN || 'chatbill-webhook-token';

// Funcție simplă pentru trimitere mesaj WhatsApp (doar trimite, nu salvează)
// Salvarea în DB este făcută de aiChatController
async function sendWhatsAppMessageToPhone(to, message) {
  if (!WHATSAPP_PHONE_ID || !WHATSAPP_TOKEN) {
    throw new Error('WhatsApp API nu este configurat');
  }

  // Trimite mesajul prin WhatsApp API
  const response = await axios.post(
    `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to: to,
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

  return response.data.messages[0].id;
}

// Funcție internă pentru trimitere mesaj WhatsApp cu salvare în conversații
// Folosită pentru trimiteri manuale din dashboard
async function sendWhatsAppMessageInternal(to, message, conversationId) {
  if (!WHATSAPP_PHONE_ID || !WHATSAPP_TOKEN) {
    throw new Error('WhatsApp API nu este configurat');
  }

  // Trimite mesajul prin WhatsApp API
  const response = await axios.post(
    `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to: to,
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

  const whatsappMessageId = response.data.messages[0].id;

  // Salvează mesajul în baza de date
  await prisma.message.create({
    data: {
      conversationId: conversationId,
      text: message,
      sender: 'assistant',
      whatsappMessageId: whatsappMessageId
    }
  });

  // Actualizează conversația
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() }
  });

  return whatsappMessageId;
}

// Verificare webhook WhatsApp
function verifyWebhook(req, res) {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
      if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
        console.log('✅ Webhook verificat cu succes');
        res.status(200).send(challenge);
      } else {
        console.log('❌ Token verificare invalid');
        res.sendStatus(403);
      }
    } else {
      res.sendStatus(400);
    }
  } catch (error) {
    console.error('Eroare verificare webhook:', error);
    res.sendStatus(500);
  }
}

// Primire mesaj WhatsApp
async function receiveMessage(req, res) {
  try {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            const value = change.value;

            if (value.messages) {
              for (const message of value.messages) {
                const from = message.from; // Numărul de telefon al expeditorului
                const messageBody = message.text?.body || '';
                const messageId = message.id;
                const timestamp = message.timestamp;

                // Normalizăm numărul - WhatsApp trimite fără +, adăugăm +
                const normalizedPhone = from.startsWith('+') ? from : `+${from}`;

                console.log(`📱 Mesaj WhatsApp primit de la ${from} (normalizat: ${normalizedPhone}): ${messageBody}`);

                // Procesează mesajul prin AI Chat (același sistem ca pe website)
                try {
                  // Verifică dacă numărul de telefon aparține unui utilizator înregistrat
                  const user = await prisma.user.findFirst({
                    where: {
                      phone: normalizedPhone
                    }
                  });

                  if (user) {
                    console.log(`👤 Utilizator identificat: ${user.name} (${user.email})`);
                  } else {
                    console.log(`👤 Număr neînregistrat: ${normalizedPhone}`);
                    // Trimite mesaj automat pentru utilizatori noi
                    await sendWhatsAppMessageToPhone(
                      from,
                      `👋 Bună! Pentru a accesa toate funcțiile ChatBill (generare facturi, istoric conversații, etc.), vă rugăm să vă creați un cont pe platforma noastră.\n\n🔗 Vizitați: https://chatbill.ro/register\n\nDupă ce vă creați contul, puteți asocia acest număr de WhatsApp în secțiunea Setări > WhatsApp.`
                    );
                    res.sendStatus(200);
                    return;
                  }

                  // Găsește sesiunea AI existentă pentru acest număr de telefon
                  let chatSession = await prisma.chatSession.findFirst({
                    where: {
                      OR: [
                        { phoneNumber: from },
                        { phoneNumber: normalizedPhone }
                      ],
                      source: 'whatsapp'
                    },
                    include: { chatMessages: { orderBy: { createdAt: 'asc' } } },
                    orderBy: { createdAt: 'desc' }
                  });

                  // Creează sesiune nouă dacă nu există
                  if (!chatSession) {
                    chatSession = await prisma.chatSession.create({
                      data: {
                        phoneNumber: normalizedPhone,
                        source: 'whatsapp',
                        currentStep: 'greeting'
                      },
                      include: { chatMessages: true }
                    });
                  }

                  // Verifică dacă este în proces de înregistrare
                  const metadata = chatSession.metadata ? JSON.parse(chatSession.metadata) : {};
                  const isRegistering = metadata.registrationInProgress;

                  // Procesează comanda "cont nou" sau "register"
                  const lowerMessage = messageBody.toLowerCase().trim();
                  if (!user && !isRegistering && (lowerMessage.includes('cont nou') || lowerMessage.includes('register') || lowerMessage.includes('inregistrare'))) {
                    console.log(`📝 Începere proces de înregistrare pentru ${from}`);

                    const result = await startWhatsAppRegistration(from, chatSession.id);

                    if (result.success) {
                      const welcomeMsg = `🎉 Bine ai venit la ChatBill!\n\nHai să-ți creăm contul. Am nevoie de câteva informații:\n\n📧 Care este adresa ta de email?`;
                      await sendWhatsAppMessageToPhone(from, welcomeMsg);
                      console.log(`✅ Proces de înregistrare inițiat pentru ${from}`);
                      continue; // Skip procesarea normală
                    } else {
                      await sendWhatsAppMessageToPhone(from, result.error);
                      continue;
                    }
                  }

                  // Procesează pașii de înregistrare dacă este în curs
                  if (isRegistering) {
                    console.log(`📝 Procesare pas înregistrare: ${metadata.registrationStep} pentru ${from}`);

                    const result = await processRegistrationStep(chatSession, messageBody);

                    if (result.success) {
                      // Actualizează sesiunea cu noul pas
                      if (result.nextStep === 'create_account') {
                        // Creează contul
                        const accountResult = await createWhatsAppAccount(result.registrationData);

                        if (accountResult.success) {
                          // Șterge metadata de înregistrare
                          await prisma.chatSession.update({
                            where: { id: chatSession.id },
                            data: { metadata: null }
                          });

                          const successMsg = `✅ Contul tău a fost creat cu succes!\n\n👤 Nume: ${accountResult.user.name}\n📧 Email: ${accountResult.user.email}\n📱 Telefon: ${accountResult.user.phone}\n\nAcum mă poți folosi pentru a genera facturi! 🎉\n\nScrie "ajutor" pentru a vedea ce pot face.`;
                          await sendWhatsAppMessageToPhone(from, successMsg);
                          console.log(`✅ Cont creat cu succes pentru ${from}`);
                        } else {
                          await sendWhatsAppMessageToPhone(from, accountResult.error);
                        }
                      } else {
                        // Actualizează și trimite următoarea întrebare
                        await prisma.chatSession.update({
                          where: { id: chatSession.id },
                          data: {
                            metadata: JSON.stringify({
                              registrationInProgress: true,
                              registrationStep: result.nextStep,
                              registrationData: result.registrationData
                            })
                          }
                        });

                        await sendWhatsAppMessageToPhone(from, result.message);
                      }
                    } else {
                      await sendWhatsAppMessageToPhone(from, result.message);
                    }

                    continue; // Skip procesarea AI normală
                  }

                  // Creează mock request/response pentru a apela aiChatController
                  const mockReq = {
                    body: {
                      sessionId: chatSession?.id,
                      message: messageBody,
                      source: 'whatsapp',
                      phoneNumber: from,
                      // Adaugă informații despre utilizator dacă există
                      user: user ? {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        company: user.company,
                        cui: user.cui,
                        hasAccount: true
                      } : {
                        hasAccount: false
                      }
                    }
                  };

                  let aiResponse;
                  const mockRes = {
                    json: (data) => {
                      aiResponse = data;
                      return mockRes;
                    },
                    status: (code) => {
                      return {
                        json: (data) => {
                          aiResponse = data;
                          return mockRes;
                        }
                      };
                    }
                  };

                  // Apelează AI Chat Controller
                  console.log(`🔄 Apelare AI Chat Controller pentru ${from}...`);
                  await aiChatController.sendMessage(mockReq, mockRes);
                  console.log(`✅ AI Controller răspuns primit:`, aiResponse);

                  // Trimite răspunsul AI prin WhatsApp
                  if (aiResponse && aiResponse.success && aiResponse.message) {
                    console.log(`📤 Trimit răspuns AI prin WhatsApp către ${from}...`);
                    await sendWhatsAppMessageToPhone(from, aiResponse.message);
                    console.log(`🤖 Răspuns AI trimis către ${from}`);
                  } else {
                    console.error(`❌ Răspuns AI invalid:`, aiResponse);
                  }
                } catch (error) {
                  console.error('❌ Eroare procesare mesaj WhatsApp cu AI:', error);
                  console.error('Stack trace:', error.stack);
                  // Fallback - trimite mesaj generic dacă AI fails
                  try {
                    await sendWhatsAppMessageToPhone(from, 'Ne pare rău, am întâmpinat o problemă tehnică. Te rugăm să încerci din nou.');
                  } catch (sendError) {
                    console.error('❌ Eroare trimitere mesaj fallback:', sendError);
                  }
                }
              }
            }

            // Marchează mesajele ca citite
            if (value.statuses) {
              for (const status of value.statuses) {
                console.log(`📊 Status WhatsApp: ${status.status} pentru ${status.id}`);
              }
            }
          }
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Eroare primire mesaj WhatsApp:', error);
    res.sendStatus(500);
  }
}

// Trimitere mesaj WhatsApp
async function sendMessage(req, res) {
  try {
    const { to, message, conversationId } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: 'Numărul de telefon și mesajul sunt obligatorii' });
    }

    if (!WHATSAPP_PHONE_ID || !WHATSAPP_TOKEN) {
      return res.status(500).json({ error: 'WhatsApp API nu este configurat' });
    }

    // Trimite mesajul prin WhatsApp API
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to,
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

    const whatsappMessageId = response.data.messages[0].id;

    // Salvează mesajul în baza de date
    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId }
      });
    } else {
      // Găsește sau crează conversația
      conversation = await prisma.conversation.findFirst({
        where: {
          phoneNumber: to,
          type: 'whatsapp'
        }
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            title: `WhatsApp - ${to}`,
            phoneNumber: to,
            type: 'whatsapp'
          }
        });
      }
    }

    const savedMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        text: message,
        sender: 'assistant',
        whatsappMessageId: whatsappMessageId
      }
    });

    // Actualizează conversația
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() }
    });

    res.status(200).json({
      success: true,
      message: savedMessage,
      whatsappMessageId: whatsappMessageId
    });
  } catch (error) {
    console.error('Eroare trimitere mesaj WhatsApp:', error);
    res.status(500).json({
      error: 'Eroare la trimiterea mesajului WhatsApp',
      details: error.response?.data || error.message
    });
  }
}

// Creare conversație WhatsApp
async function createConversation(req, res) {
  try {
    const { title, phoneNumber, userId } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Numărul de telefon este obligatoriu' });
    }

    const conversation = await prisma.conversation.create({
      data: {
        title: title || `WhatsApp - ${phoneNumber}`,
        phoneNumber: phoneNumber,
        type: 'whatsapp',
        userId: userId || null
      },
      include: {
        _count: {
          select: { messages: true }
        }
      }
    });

    res.status(201).json(conversation);
  } catch (error) {
    console.error('Eroare creare conversație WhatsApp:', error);
    res.status(500).json({ error: 'Eroare la crearea conversației WhatsApp' });
  }
}

// Obține toate conversațiile WhatsApp
async function getConversations(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const conversations = await prisma.conversation.findMany({
      where: {
        type: 'whatsapp'
      },
      orderBy: { updatedAt: 'desc' },
      skip: skip,
      take: parseInt(limit),
      include: {
        _count: {
          select: { messages: true }
        }
      }
    });

    const total = await prisma.conversation.count({
      where: { type: 'whatsapp' }
    });

    res.json({
      conversations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Eroare obținere conversații WhatsApp:', error);
    res.status(500).json({ error: 'Eroare la obținerea conversațiilor WhatsApp' });
  }
}

// Obține o conversație WhatsApp specifică
async function getConversation(req, res) {
  try {
    const { id } = req.params;

    const conversation = await prisma.conversation.findUnique({
      where: {
        id,
        type: 'whatsapp'
      },
      include: {
        _count: {
          select: { messages: true }
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversație WhatsApp negăsită' });
    }

    res.json(conversation);
  } catch (error) {
    console.error('Eroare obținere conversație WhatsApp:', error);
    res.status(500).json({ error: 'Eroare la obținerea conversației WhatsApp' });
  }
}

// Obține mesajele unei conversații WhatsApp
async function getConversationMessages(req, res) {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { timestamp: 'asc' },
      skip: skip,
      take: parseInt(limit)
    });

    const total = await prisma.message.count({
      where: { conversationId: id }
    });

    res.json({
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Eroare obținere mesaje WhatsApp:', error);
    res.status(500).json({ error: 'Eroare la obținerea mesajelor WhatsApp' });
  }
}

// POST /api/whatsapp/send-verification - Trimite cod de verificare pe WhatsApp
async function sendPhoneVerificationCode(req, res) {
  try {
    const { phoneNumber } = req.body;
    const userId = req.user.id; // Din middleware de autentificare

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Numărul de telefon este obligatoriu' });
    }

    // Verifică dacă numărul este deja folosit de alt utilizator
    const existingUser = await prisma.user.findFirst({
      where: {
        phone: phoneNumber,
        phoneVerified: true,
        NOT: { id: userId }
      }
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'Acest număr de telefon este deja asociat cu alt cont'
      });
    }

    // Generează cod de verificare
    const verificationCode = generateVerificationCode();
    const expiry = getCodeExpiry();

    // Salvează codul în baza de date
    await prisma.user.update({
      where: { id: userId },
      data: {
        phone: phoneNumber,
        phoneVerified: false,
        phoneVerificationCode: verificationCode,
        phoneVerificationExpiry: expiry
      }
    });

    // Trimite codul pe WhatsApp
    const message = `🔐 ChatBill - Cod de verificare\n\nCodul tău este: ${verificationCode}\n\nCodul este valabil 10 minute.\n\nDacă nu ai solicitat acest cod, te rugăm să ignori mesajul.`;

    await sendWhatsAppMessageToPhone(phoneNumber, message);

    console.log(`📱 Cod de verificare trimis pe WhatsApp către ${phoneNumber}`);

    res.json({
      success: true,
      message: 'Codul de verificare a fost trimis pe WhatsApp',
      expiresIn: 600 // 10 minute în secunde
    });

  } catch (error) {
    console.error('Eroare trimitere cod verificare:', error);
    res.status(500).json({
      error: 'Eroare la trimiterea codului de verificare',
      details: error.message
    });
  }
}

// POST /api/whatsapp/verify-phone - Verifică codul și asociază numărul cu contul
async function verifyPhoneCode(req, res) {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    if (!code) {
      return res.status(400).json({ error: 'Codul de verificare este obligatoriu' });
    }

    // Găsește utilizatorul
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.phone) {
      return res.status(400).json({
        error: 'Nu există un număr de telefon în așteptarea verificării'
      });
    }

    // Verifică codul
    if (!isCodeValid(user.phoneVerificationCode, code, user.phoneVerificationExpiry)) {
      return res.status(400).json({
        error: 'Cod invalid sau expirat. Te rugăm să soliciti un cod nou.'
      });
    }

    // Marchează telefonul ca verificat și șterge codul
    await prisma.user.update({
      where: { id: userId },
      data: {
        phoneVerified: true,
        phoneVerificationCode: null,
        phoneVerificationExpiry: null
      }
    });

    console.log(`✅ Număr de telefon ${user.phone} verificat pentru user ${user.email}`);

    res.json({
      success: true,
      message: 'Numărul de telefon a fost verificat cu succes!'
    });

  } catch (error) {
    console.error('Eroare verificare cod:', error);
    res.status(500).json({
      error: 'Eroare la verificarea codului',
      details: error.message
    });
  }
}

module.exports = {
  verifyWebhook,
  receiveMessage,
  sendMessage,
  createConversation,
  getConversations,
  getConversation,
  getConversationMessages,
  sendPhoneVerificationCode,
  verifyPhoneCode
};
