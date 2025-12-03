const OpenAI = require('openai');
const prisma = require('../db/prismaWrapper');

// Verifică dacă API key-ul există
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY nu este setat - GPT Chat va fi dezactivat');
}

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

// Sistem prompt pentru ChatBill Assistant
const SYSTEM_PROMPT = `Ești ChatBill Assistant, un asistent AI prietenos și competent pentru aplicația de facturare ChatBill din România.

Rolul tău:
- Ajuți utilizatorii cu întrebări despre facturare, TVA, legislație fiscală din România
- Explici funcționalitățile aplicației ChatBill (generare facturi, integrare ANAF e-Factura, validare CUI, etc.)
- Oferi sfaturi despre organizarea documentelor fiscale
- Răspunzi în limba română, într-un stil prietenos dar profesional

Cunoștințe despre ChatBill:
- Generare facturi prin formular sau chat conversațional AI
- Validare automată CUI prin ANAF
- Integrare cu ANAF e-Factura pentru trimitere facturi electronice
- Export PDF pentru facturi
- Gestionare clienți și produse
- Istoric facturi generate

Terminologie română - Înțelegi următoarele abrevieri și variante:
- "juridice" sau "PJ" = persoane juridice (companii, SRL, SA, etc.)
- "fizice" sau "PF" = persoane fizice (persoane individuale, PFA)
- "CUI" = Cod Unic de Înregistrare (pentru companii)
- "CNP" = Cod Numeric Personal (pentru persoane fizice)
- "TVA" = Taxa pe Valoare Adăugată
- "ANAF" = Agenția Națională de Administrare Fiscală
- "e-Factura" sau "efactura" = sistem național de facturare electronică ANAF
- "IBAN" = cod cont bancar
- "RegCom" sau "J40" = Registrul Comerțului
- "firma" = companie, societate comercială
- "factura" = factură fiscală

Context Important:
- Când utilizatorul zice "juridice" înțelege că se referă la "persoane juridice" (companii)
- Când întreabă despre "firme" se referă la companii/persoane juridice
- TVA standard în România: 19%
- TVA redus: 9% (alimente, medicamente, cărți)
- TVA super-redus: 5% (locuințe sociale, anumite servicii)

Limitări:
- Nu poți efectua acțiuni direct în aplicație (nu poți genera facturi, nu poți salva date)
- Pentru acțiuni concrete, îndrumă utilizatorul către secțiunile corespunzătoare
- Nu oferi sfaturi juridice sau fiscale oficiale - recomandă consultarea unui contabil autorizat

Răspunde concis, clar și util. Dacă nu știi un răspuns, recunoaște-l sincer.`;

// POST /api/gpt-chat/message - Trimite mesaj către GPT
async function sendMessage(req, res) {
  try {
    // Verifică dacă OpenAI este configurat
    if (!openai) {
      return res.status(503).json({
        success: false,
        error: 'GPT Chat nu este configurat. Adaugă OPENAI_API_KEY în .env'
      });
    }

    const { message, conversationHistory = [] } = req.body;
    const userId = req.user.id;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Mesajul este obligatoriu'
      });
    }

    // Construiește istoricul conversației pentru context
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    console.log(`💬 GPT Chat - User ${userId}: ${message.substring(0, 50)}...`);

    // Apel către OpenAI GPT-4
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Sau gpt-4 pentru calitate maximă
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
      user: `user_${userId}`
    });

    const assistantMessage = completion.choices[0].message.content;

    // Salvează conversația în baza de date (opțional)
    try {
      await prisma.chatMessage.create({
        data: {
          userId: userId,
          role: 'user',
          content: message,
          metadata: {
            model: 'gpt-4o-mini',
            tokens: completion.usage.total_tokens
          }
        }
      });

      await prisma.chatMessage.create({
        data: {
          userId: userId,
          role: 'assistant',
          content: assistantMessage,
          metadata: {
            model: 'gpt-4o-mini',
            tokens: completion.usage.total_tokens
          }
        }
      });
    } catch (dbError) {
      console.warn('⚠️ Nu s-a putut salva mesajul în DB:', dbError.message);
      // Continuă chiar dacă salvarea eșuează
    }

    console.log(`✅ GPT răspuns: ${assistantMessage.substring(0, 50)}... (${completion.usage.total_tokens} tokens)`);

    res.json({
      success: true,
      message: assistantMessage,
      usage: {
        prompt_tokens: completion.usage.prompt_tokens,
        completion_tokens: completion.usage.completion_tokens,
        total_tokens: completion.usage.total_tokens
      }
    });

  } catch (error) {
    console.error('❌ Eroare GPT Chat:', error);
    
    if (error.code === 'insufficient_quota') {
      return res.status(402).json({
        success: false,
        error: 'Limită OpenAI atinsă. Te rog contactează administratorul.'
      });
    }

    if (error.code === 'invalid_api_key') {
      return res.status(500).json({
        success: false,
        error: 'Configurare OpenAI invalidă'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Eroare la procesarea mesajului',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// GET /api/gpt-chat/history - Obține istoricul conversațiilor
async function getHistory(req, res) {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;

    const messages = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
        metadata: true
      }
    });

    res.json({
      success: true,
      messages: messages.reverse(), // Inversăm pentru ordine cronologică
      count: messages.length
    });

  } catch (error) {
    console.error('❌ Eroare obținere istoric:', error);
    res.status(500).json({
      success: false,
      error: 'Eroare la obținerea istoricului'
    });
  }
}

// DELETE /api/gpt-chat/history - Șterge istoricul conversațiilor
async function clearHistory(req, res) {
  try {
    const userId = req.user.id;

    const result = await prisma.chatMessage.deleteMany({
      where: { userId }
    });

    console.log(`🗑️ Istoric șters pentru user ${userId}: ${result.count} mesaje`);

    res.json({
      success: true,
      message: 'Istoric șters cu succes',
      deletedCount: result.count
    });

  } catch (error) {
    console.error('❌ Eroare ștergere istoric:', error);
    res.status(500).json({
      success: false,
      error: 'Eroare la ștergerea istoricului'
    });
  }
}

module.exports = {
  sendMessage,
  getHistory,
  clearHistory
};
