# WhatsApp API - Referință rapidă

## 📋 Rute disponibile

### Webhook (Public)
```
GET  /api/whatsapp/webhook          - Verificare webhook Meta
POST /api/whatsapp/webhook          - Primire mesaje WhatsApp
```

### Conversații (Autentificate)
```
POST /api/whatsapp/conversations              - Creare conversație nouă
GET  /api/whatsapp/conversations              - Lista conversații (cu paginare)
GET  /api/whatsapp/conversations/:id          - Detalii conversație
GET  /api/whatsapp/conversations/:id/messages - Mesaje conversație (cu paginare)
```

### Mesaje (Autentificate)
```
POST /api/whatsapp/send                       - Trimitere mesaj WhatsApp
```

## 🔑 Variabile de mediu necesare

Adaugă în `.env`:
```env
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_ID=your_phone_number_id
WHATSAPP_TOKEN=your_access_token
WEBHOOK_VERIFY_TOKEN=your_verify_token
```

## 🚀 Exemple rapide

### Trimitere mesaj
```bash
curl -X POST https://chatbill.ro/api/whatsapp/send \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to":"40712345678","message":"Salut!"}'
```

### Obținere conversații
```bash
curl -X GET "https://chatbill.ro/api/whatsapp/conversations?page=1&limit=20" \
  -H "Authorization: Bearer TOKEN"
```

### Obținere mesaje
```bash
curl -X GET "https://chatbill.ro/api/whatsapp/conversations/UUID/messages" \
  -H "Authorization: Bearer TOKEN"
```

## 📱 JavaScript/TypeScript

```typescript
// Trimitere mesaj
const send = async (to: string, message: string) => {
  const res = await fetch('/api/whatsapp/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ to, message })
  });
  return res.json();
};

// Obținere conversații
const getConversations = async (page = 1) => {
  const res = await fetch(`/api/whatsapp/conversations?page=${page}&limit=20`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
};
```

## 🔒 Securitate

- Toate rutele conversații/mesaje necesită **autentificare JWT**
- Webhook-urile folosesc **token de verificare Meta**
- Rate limiting activ pe toate rutele

## 📊 Rate Limits

- **Chat** (send, create): 20 req/min
- **API** (get): 100 req/15min

## 📝 Notițe

- Format telefon: `40712345678` (fără `+`)
- Conversații create automat la mesaj nou
- Mesajele au `whatsappMessageId` unic
- Timestamp-uri în format ISO 8601

## 📖 Documentație completă

- [WHATSAPP_SETUP.md](WHATSAPP_SETUP.md) - Configurare completă
- [WHATSAPP_API_ROUTES.md](WHATSAPP_API_ROUTES.md) - Documentație API detaliată
