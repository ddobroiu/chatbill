# Configurare WhatsApp API pentru ChatBill

Acest document explică cum să configurezi integrarea WhatsApp Business API pentru ChatBill.

## Cerințe preliminare

1. **Cont Meta Business** (Facebook Business)
2. **WhatsApp Business Account** configurat
3. **Acces la WhatsApp Business API**

## Pași de configurare

### 1. Creare aplicație Meta Developers

1. Accesează [Meta for Developers](https://developers.facebook.com/)
2. Creează o aplicație nouă
3. Adaugă produsul **WhatsApp** la aplicație

### 2. Configurare WhatsApp Business API

1. În dashboard-ul aplicației tale Meta, accesează secțiunea **WhatsApp > API Setup**
2. Notează următoarele valori:
   - **Phone Number ID** - ID-ul numerelor de telefon WhatsApp
   - **WhatsApp Business Account ID** - ID-ul contului de business
   - **Access Token** - Token-ul de acces (generează unul permanent)

### 3. Configurare variabile de mediu

Adaugă următoarele variabile în fișierul `.env`:

```env
# WhatsApp Configuration
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_ID=your_phone_number_id_here
WHATSAPP_TOKEN=your_access_token_here
WEBHOOK_VERIFY_TOKEN=chatbill-webhook-token-change-this
```

### 4. Configurare Webhook

1. În dashboard-ul Meta Developers, accesează **WhatsApp > Configuration**
2. La secțiunea **Webhook**, adaugă URL-ul webhook-ului tău:
   ```
   https://your-domain.com/api/whatsapp/webhook
   ```
3. Adaugă **Verify Token** (același cu `WEBHOOK_VERIFY_TOKEN` din `.env`)
4. Abonează-te la următoarele evenimente:
   - `messages` - pentru primirea mesajelor
   - `message_status` - pentru status-ul mesajelor (citit, livrat, etc.)

### 5. Configurare permisiuni

Asigură-te că aplicația ta Meta are următoarele permisiuni:
- `whatsapp_business_messaging` - pentru trimiterea și primirea mesajelor
- `whatsapp_business_management` - pentru gestionarea contului

## Migrare bază de date

După ce ai actualizat schema Prisma, rulează migrarea:

```bash
cd backend
npx prisma migrate dev --name add_whatsapp_support
```

## Utilizare API

### Rute disponibile

#### 1. Webhook verificare (GET)
```
GET /api/whatsapp/webhook
```
Folosit de Meta pentru verificarea webhook-ului.

#### 2. Webhook primire mesaje (POST)
```
POST /api/whatsapp/webhook
```
Primește mesajele WhatsApp de la Meta.

#### 3. Trimitere mesaj WhatsApp (POST)
```
POST /api/whatsapp/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "to": "40712345678",
  "message": "Salut! Ți-am trimis factura.",
  "conversationId": "optional-conversation-id"
}
```

**Răspuns:**
```json
{
  "success": true,
  "message": {
    "id": "message-id",
    "conversationId": "conversation-id",
    "text": "Salut! Ți-am trimis factura.",
    "sender": "assistant",
    "timestamp": "2025-12-12T10:30:00.000Z"
  },
  "whatsappMessageId": "wamid.xxx"
}
```

#### 4. Obținere conversații WhatsApp (GET)
```
GET /api/whatsapp/conversations?page=1&limit=20
Authorization: Bearer <token>
```

**Răspuns:**
```json
{
  "conversations": [
    {
      "id": "conversation-id",
      "title": "WhatsApp - 40712345678",
      "phoneNumber": "40712345678",
      "type": "whatsapp",
      "status": "active",
      "createdAt": "2025-12-12T10:00:00.000Z",
      "updatedAt": "2025-12-12T10:30:00.000Z",
      "_count": {
        "messages": 5
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

#### 5. Obținere mesaje conversație WhatsApp (GET)
```
GET /api/whatsapp/conversations/:id/messages?page=1&limit=50
Authorization: Bearer <token>
```

**Răspuns:**
```json
{
  "messages": [
    {
      "id": "message-id",
      "conversationId": "conversation-id",
      "text": "Bună! Am nevoie de o factură.",
      "sender": "user",
      "whatsappMessageId": "wamid.xxx",
      "timestamp": "2025-12-12T10:00:00.000Z"
    },
    {
      "id": "message-id-2",
      "conversationId": "conversation-id",
      "text": "Bineînțeles! Îți trimit factura imediat.",
      "sender": "assistant",
      "whatsappMessageId": "wamid.yyy",
      "timestamp": "2025-12-12T10:01:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 2,
    "totalPages": 1
  }
}
```

#### 6. Creare conversație WhatsApp (POST)
```
POST /api/whatsapp/conversations
Authorization: Bearer <token>
Content-Type: application/json

{
  "phoneNumber": "40712345678",
  "title": "Client Important",
  "userId": "optional-user-id"
}
```

## Testare

### Testare webhook local cu ngrok

Pentru testare locală, folosește ngrok:

```bash
ngrok http 3000
```

Apoi configurează URL-ul webhook în Meta Developers:
```
https://your-ngrok-url.ngrok.io/api/whatsapp/webhook
```

### Testare trimitere mesaj

```bash
curl -X POST https://your-domain.com/api/whatsapp/send \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "40712345678",
    "message": "Test message from ChatBill"
  }'
```

## Limitări și restricții

1. **Rate Limiting**: WhatsApp Business API are limite de mesaje pe zi în funcție de nivelul de verificare
2. **Template Messages**: Pentru mesajele inițiate de business (în afara ferestrei de 24h), trebuie să folosești template-uri pre-aprobate
3. **Costuri**: WhatsApp Business API are costuri per mesaj (vezi prețurile Meta)

## Debugging

Pentru debugging, verifică log-urile serverului:

```bash
# Development
npm run dev

# Production
pm2 logs chatbill
```

## Securitate

- **Token-uri**: Nu partaja niciodată `WHATSAPP_TOKEN` sau `WEBHOOK_VERIFY_TOKEN`
- **HTTPS**: Asigură-te că webhook-ul folosește HTTPS în producție
- **Validare**: Toate mesajele primite sunt validate și procesate securizat

## Resurse utile

- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [Meta Business Suite](https://business.facebook.com/)
- [WhatsApp Business Manager](https://business.facebook.com/wa/manage/)

## Suport

Pentru probleme legate de integrarea WhatsApp, consultă:
1. Documentația Meta for Developers
2. Support-ul Meta Business
3. Documentația ChatBill
