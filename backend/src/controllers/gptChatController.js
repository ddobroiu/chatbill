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
- **POȚI GENERA FACTURI automat când utilizatorul cere, folosind funcția generate_invoice**

Cunoștințe despre ChatBill:
- Generare facturi prin formular sau chat conversațional AI
- Validare automată CUI prin ANAF
- Integrare cu ANAF e-Factura pentru trimitere facturi electronice
- Export PDF pentru facturi
- Gestionare clienți și produse
- Istoric facturi generate

IMPORTANT - Generare Facturi prin Chat:
- Când utilizatorul zice "vreau să emit o factură" sau "generează o factură", întreabă despre:
  1. Clientul (CUI pentru companii SAU CNP pentru persoane fizice)
  2. Produsele/serviciile (nume, cantitate, preț unitar, TVA)
- **Când utilizatorul oferă un CUI, FOLOSEȘTE ÎNTÂI funcția lookup_company_by_cui pentru a căuta automat datele companiei din ANAF**
- **DUPĂ CE AI FOLOSIT lookup_company_by_cui cu succes, știi că clientul este de tip "company" - NU mai întreba dacă e persoană juridică sau fizică!**
- După ce ai datele companiei (fie din lookup, fie introduse manual), cere detalii despre produse
- După ce ai toate datele necesare, FOLOSEȘTE funcția generate_invoice pentru a emite factura automat
- Nu îi spune utilizatorului să meargă în altă secțiune - TU POȚI genera factura direct!

Format pentru generate_invoice:
{
  "client": {
    "type": "company" sau "individual",
    "name": "Nume companie",
    "cui": "12345678" (dacă e companie),
    "regCom": "J40/123/2024" (opțional),
    "cnp": "1234567890123" (dacă e persoană fizică),
    "address": "Adresa",
    "city": "București",
    "county": "București"
  },
  "products": [
    {
      "name": "Nume produs/serviciu",
      "quantity": 1,
      "unit": "buc",
      "price": 100,
      "vat": 19
    }
  ]
}

Terminologie română - Înțelegi următoarele abrevieri și variante:
- "juridice" sau "PJ" = persoane juridice (companii, SRL, SA, etc.)
- "fizice" sau "PF" = persoane fizice (persoane individuale, PFA)
- "CUI" = Cod Unic de Înregistrare (pentru companii)
- "CNP" = Cod Numeric Personal (pentru persoane fizice)
- "TVA" = Taxa pe Valoare Adăugată
- "ANAF" = Agenția Națională de Administrare Fiscală
- "e-Factura" sau "efactura" = sistem național de facturare electronică ANAF

Context Important - Decembrie 2025:
- TVA standard în România: 19%
- TVA redus: 9% (alimente, medicamente, cărți, hoteluri)
- TVA super-redus: 5% (locuințe sociale)

Răspunde concis, clar și util. Când ai toate informațiile necesare pentru o factură, generează-o automat!`;

// Funcții disponibile pentru GPT (Function Calling)
const FUNCTIONS = [
  {
    name: 'lookup_company_by_cui',
    description: 'Caută datele unei companii din România folosind CUI-ul (Cod Unic de Înregistrare). Folosește această funcție când utilizatorul oferă un CUI și vrei să completezi automat datele companiei.',
    parameters: {
      type: 'object',
      properties: {
        cui: {
          type: 'string',
          description: 'CUI-ul companiei (cu sau fără RO)'
        }
      },
      required: ['cui']
    }
  },
  {
    name: 'generate_invoice',
    description: 'Generează o factură nouă cu datele clientului și produsele/serviciile. Folosește această funcție când utilizatorul cere să emită o factură și ai toate datele necesare.',
    parameters: {
      type: 'object',
      properties: {
        client: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['company', 'individual'],
              description: 'Tipul clientului: company pentru persoane juridice, individual pentru persoane fizice'
            },
            name: {
              type: 'string',
              description: 'Numele companiei sau al persoanei fizice'
            },
            cui: {
              type: 'string',
              description: 'CUI-ul companiei (doar pentru company)'
            },
            cnp: {
              type: 'string',
              description: 'CNP-ul persoanei fizice (doar pentru individual)'
            },
            regCom: {
              type: 'string',
              description: 'Număr Registrul Comerțului (opțional)'
            },
            address: {
              type: 'string',
              description: 'Adresa clientului'
            },
            city: {
              type: 'string',
              description: 'Orașul clientului'
            },
            county: {
              type: 'string',
              description: 'Județul clientului'
            }
          },
          required: ['type', 'name']
        },
        products: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Numele produsului sau serviciului'
              },
              quantity: {
                type: 'number',
                description: 'Cantitatea'
              },
              unit: {
                type: 'string',
                description: 'Unitatea de măsură (buc, kg, ora, etc.)',
                default: 'buc'
              },
              price: {
                type: 'number',
                description: 'Prețul unitar (fără TVA)'
              },
              vat: {
                type: 'number',
                description: 'Procentul de TVA (19, 9, 5 sau 0)',
                default: 19
              }
            },
            required: ['name', 'quantity', 'price']
          }
        }
      },
      required: ['client', 'products']
    }
  }
];

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

    // Apel către OpenAI GPT-4 cu function calling
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      functions: FUNCTIONS,
      function_call: 'auto',
      temperature: 0.7,
      max_tokens: 1000,
      user: `user_${userId}`
    });

    const responseMessage = completion.choices[0].message;

    // Verifică dacă GPT vrea să apeleze o funcție
    if (responseMessage.function_call) {
      const functionName = responseMessage.function_call.name;
      const functionArgs = JSON.parse(responseMessage.function_call.arguments);

      console.log(`🔧 GPT apelează funcția: ${functionName}`, functionArgs);

      // Funcție 1: Căutare companie după CUI
      if (functionName === 'lookup_company_by_cui') {
        const { autoCompleteCompanySettings } = require('./settingsController');
        
        try {
          let companyData = null;
          const mockReq = {
            user: req.user,
            params: { cui: functionArgs.cui }
          };
          
          const mockRes = {
            status: (code) => ({
              json: (data) => {
                companyData = data;
                return mockRes;
              }
            }),
            json: (data) => {
              companyData = data;
              return mockRes;
            }
          };

          await autoCompleteCompanySettings(mockReq, mockRes);

          if (companyData && companyData.success && companyData.settings) {
            const company = companyData.settings;
            const responseMsg = `✅ Am găsit compania!\n\n` +
              `📋 **${company.name}**\n` +
              `- CUI: ${company.cui}\n` +
              `- Reg. Com: ${company.regCom || 'N/A'}\n` +
              `- Adresă: ${company.address || 'N/A'}\n` +
              `- Oraș: ${company.city || 'N/A'}, ${company.county || 'N/A'}\n\n` +
              `Acum îmi poți spune ce produse/servicii să includ în factură:\n` +
              `- Nume produs/serviciu\n` +
              `- Cantitate\n` +
              `- Preț unitar (fără TVA)\n` +
              `- TVA (19%, 9% sau 5%)`;

            // Salvează în istoric pentru context
            messages.push(responseMessage);
            messages.push({
              role: 'function',
              name: functionName,
              content: JSON.stringify(company)
            });

            // Cere GPT să formuleze răspunsul
            const followUpCompletion = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [...messages, {
                role: 'assistant',
                content: responseMsg
              }],
              temperature: 0.7,
              max_tokens: 500,
              user: `user_${userId}`
            });

            return res.json({
              success: true,
              message: responseMsg,
              companyData: company
            });
          } else {
            return res.json({
              success: true,
              message: `❌ Nu am găsit o companie cu CUI-ul ${functionArgs.cui} în baza de date ANAF. Verifică dacă CUI-ul este corect.`
            });
          }
        } catch (error) {
          console.error('❌ Eroare căutare companie:', error);
          return res.json({
            success: true,
            message: `❌ Nu am putut căuta compania: ${error.message}`
          });
        }
      }

      // Funcție 2: Generare factură
      if (functionName === 'generate_invoice') {
        // Importă invoiceController pentru a genera factura
        const { createInvoice } = require('./invoiceController');
        
        try {
          // Creează un request mock pentru createInvoice
          const mockReq = {
            user: req.user,
            body: {
              client: functionArgs.client,
              products: functionArgs.products
            }
          };

          // Creează un response mock
          let invoiceResult = null;
          const mockRes = {
            status: (code) => ({
              json: (data) => {
                invoiceResult = data;
                return mockRes;
              }
            }),
            json: (data) => {
              invoiceResult = data;
              return mockRes;
            }
          };

          // Apelează createInvoice
          await createInvoice(mockReq, mockRes);

          if (invoiceResult && invoiceResult.success) {
            // Factura a fost generată cu succes
            const finalMessage = `✅ Perfect! Am generat factura cu numărul ${invoiceResult.invoice.invoiceNumber}.\n\n` +
              `📄 Detalii:\n` +
              `- Client: ${functionArgs.client.name}\n` +
              `- Total: ${invoiceResult.invoice.total.toFixed(2)} RON\n` +
              `- PDF: [Descarcă factura](${invoiceResult.pdfPath})\n\n` +
              `Factura a fost salvată și poți să o vezi în secțiunea "Istoric Facturi".`;

            // Salvează conversația
            try {
              await prisma.chatMessage.create({
                data: {
                  userId: userId,
                  role: 'user',
                  content: message,
                  metadata: JSON.stringify({
                    model: 'gpt-4o-mini',
                    tokens: completion.usage.total_tokens
                  })
                }
              });

              await prisma.chatMessage.create({
                data: {
                  userId: userId,
                  role: 'assistant',
                  content: finalMessage,
                  metadata: JSON.stringify({
                    model: 'gpt-4o-mini',
                    function_call: 'generate_invoice',
                    invoice_id: invoiceResult.invoice.id
                  })
                }
              });
            } catch (dbError) {
              console.warn('⚠️ Nu s-a putut salva mesajul în DB:', dbError.message);
            }

            return res.json({
              success: true,
              message: finalMessage,
              invoice: invoiceResult.invoice,
              pdfPath: invoiceResult.pdfPath
            });
          } else {
            // Eroare la generarea facturii
            const errorMessage = `❌ Am întâmpinat o problemă la generarea facturii: ${invoiceResult?.error || 'Eroare necunoscută'}. Te rog să verifici datele și să încerci din nou.`;
            
            return res.json({
              success: true,
              message: errorMessage
            });
          }
        } catch (error) {
          console.error('❌ Eroare la generarea facturii din chat:', error);
          const errorMessage = `❌ Am întâmpinat o eroare la generarea facturii: ${error.message}. Te rog să încerci din nou sau să folosești formularul de generare facturi.`;
          
          return res.json({
            success: true,
            message: errorMessage
          });
        }
      }
    }

    // Răspuns normal (fără function call)
    const assistantMessage = responseMessage.content;

    // Salvează conversația în baza de date (opțional)
    try {
      await prisma.chatMessage.create({
        data: {
          userId: userId,
          role: 'user',
          content: message,
          metadata: JSON.stringify({
            model: 'gpt-4o-mini',
            tokens: completion.usage.total_tokens
          })
        }
      });

      await prisma.chatMessage.create({
        data: {
          userId: userId,
          role: 'assistant',
          content: assistantMessage,
          metadata: JSON.stringify({
            model: 'gpt-4o-mini',
            tokens: completion.usage.total_tokens
          })
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
