const prisma = require('../db/prismaWrapper');
const axios = require('axios');

// WhatsApp API Configuration
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v24.0';
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID;
const WHATSAPP_TOKEN = process.env.META_API_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN;
const WEBHOOK_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || process.env.WEBHOOK_VERIFY_TOKEN || 'chatbill-webhook-token';

// Funcție internă pentru trimitere mesaj WhatsApp (fără response HTTP)
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

                console.log(`📱 Mesaj WhatsApp primit de la ${from}: ${messageBody}`);

                // Găsește sau crează conversația pentru acest număr de telefon
                let conversation = await prisma.conversation.findFirst({
                  where: {
                    phoneNumber: from,
                    type: 'whatsapp'
                  }
                });

                if (!conversation) {
                  conversation = await prisma.conversation.create({
                    data: {
                      title: `WhatsApp - ${from}`,
                      phoneNumber: from,
                      type: 'whatsapp'
                    }
                  });
                }

                // Salvează mesajul în baza de date
                await prisma.message.create({
                  data: {
                    conversationId: conversation.id,
                    text: messageBody,
                    sender: 'user',
                    whatsappMessageId: messageId,
                    timestamp: new Date(parseInt(timestamp) * 1000)
                  }
                });

                // Actualizează conversația
                await prisma.conversation.update({
                  where: { id: conversation.id },
                  data: { updatedAt: new Date() }
                });

                // Trimite răspuns automat înapoi către utilizator
                try {
                  await sendWhatsAppMessageInternal(from, `Am primit mesajul tău: "${messageBody}"\n\nÎți vom răspunde în curând!`, conversation.id);
                  console.log(`✅ Răspuns automat trimis către ${from}`);
                } catch (error) {
                  console.error('❌ Eroare trimitere răspuns automat:', error.message);
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

module.exports = {
  verifyWebhook,
  receiveMessage,
  sendMessage,
  createConversation,
  getConversations,
  getConversation,
  getConversationMessages
};
