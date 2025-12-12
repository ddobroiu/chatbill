# WhatsApp API - Rute disponibile

## Base URL
```
https://chatbill.ro/api/whatsapp
```

## Autentificare

Majoritatea rutelor necesită autentificare prin JWT token în header-ul `Authorization`:
```
Authorization: Bearer <your-jwt-token>
```

**Excepții**: Webhook-urile (`GET /webhook` și `POST /webhook`) nu necesită autentificare JWT, dar necesită token de verificare Meta.

---

## Rute Webhook (Publice)

### GET /webhook
**Descriere**: Verificare webhook pentru configurare Meta Developers

**Query Parameters**:
- `hub.mode` - "subscribe"
- `hub.verify_token` - Token-ul de verificare din `.env`
- `hub.challenge` - Challenge code de la Meta

**Răspuns success** (200):
```
<challenge-code>
```

**Răspuns error** (403):
```
Forbidden
```

---

### POST /webhook
**Descriere**: Primește mesaje WhatsApp de la Meta

**Request Body**: Payload WhatsApp webhook
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "field": "messages",
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "PHONE_NUMBER",
              "phone_number_id": "PHONE_NUMBER_ID"
            },
            "contacts": [{
              "profile": {
                "name": "NAME"
              },
              "wa_id": "WHATSAPP_ID"
            }],
            "messages": [{
              "from": "SENDER_PHONE_NUMBER",
              "id": "wamid.ID",
              "timestamp": "TIMESTAMP",
              "text": {
                "body": "MESSAGE_BODY"
              },
              "type": "text"
            }]
          }
        }
      ]
    }
  ]
}
```

**Răspuns** (200):
```
OK
```

**Funcționalitate**:
- Creează automat conversație pentru numărul de telefon nou
- Salvează mesajul în baza de date
- Actualizează timestamp-ul conversației
- Poate declanșa răspuns automat (opțional)

---

## Rute Gestionare Conversații (Autentificate)

### POST /conversations
**Descriere**: Creează o conversație WhatsApp nouă

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "phoneNumber": "40712345678",
  "title": "WhatsApp - Client Nume",
  "userId": "user-id-optional"
}
```

**Răspuns** (201):
```json
{
  "id": "conversation-uuid",
  "title": "WhatsApp - Client Nume",
  "phoneNumber": "40712345678",
  "type": "whatsapp",
  "status": "active",
  "userId": "user-id",
  "createdAt": "2025-12-12T10:00:00.000Z",
  "updatedAt": "2025-12-12T10:00:00.000Z",
  "_count": {
    "messages": 0
  }
}
```

**Validare**:
- `phoneNumber` - obligatoriu
- `title` - opțional (se generează automat dacă lipsește)
- `userId` - opțional

---

### GET /conversations
**Descriere**: Obține lista conversațiilor WhatsApp cu paginare

**Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
- `page` - numărul paginii (default: 1)
- `limit` - număr conversații per pagină (default: 20)

**Exemplu request**:
```
GET /api/whatsapp/conversations?page=1&limit=20
```

**Răspuns** (200):
```json
{
  "conversations": [
    {
      "id": "conversation-uuid",
      "title": "WhatsApp - 40712345678",
      "phoneNumber": "40712345678",
      "type": "whatsapp",
      "status": "active",
      "userId": null,
      "createdAt": "2025-12-12T10:00:00.000Z",
      "updatedAt": "2025-12-12T10:30:00.000Z",
      "_count": {
        "messages": 15
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### GET /conversations/:id
**Descriere**: Obține detalii despre o conversație WhatsApp specifică

**Headers**:
```
Authorization: Bearer <token>
```

**URL Parameters**:
- `id` - UUID-ul conversației

**Exemplu request**:
```
GET /api/whatsapp/conversations/550e8400-e29b-41d4-a716-446655440000
```

**Răspuns** (200):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "WhatsApp - 40712345678",
  "phoneNumber": "40712345678",
  "type": "whatsapp",
  "status": "active",
  "userId": "user-uuid",
  "createdAt": "2025-12-12T10:00:00.000Z",
  "updatedAt": "2025-12-12T10:30:00.000Z",
  "_count": {
    "messages": 15
  }
}
```

**Răspuns** (404):
```json
{
  "error": "Conversație WhatsApp negăsită"
}
```

---

### GET /conversations/:id/messages
**Descriere**: Obține mesajele unei conversații WhatsApp cu paginare

**Headers**:
```
Authorization: Bearer <token>
```

**URL Parameters**:
- `id` - UUID-ul conversației

**Query Parameters**:
- `page` - numărul paginii (default: 1)
- `limit` - număr mesaje per pagină (default: 50)

**Exemplu request**:
```
GET /api/whatsapp/conversations/550e8400-e29b-41d4-a716-446655440000/messages?page=1&limit=50
```

**Răspuns** (200):
```json
{
  "messages": [
    {
      "id": "message-uuid-1",
      "conversationId": "550e8400-e29b-41d4-a716-446655440000",
      "text": "Bună! Am nevoie de o factură pentru serviciile prestate.",
      "sender": "user",
      "whatsappMessageId": "wamid.HBgNNDA3MjEyMzQ1Njc4FQIAERgSQjE2N0JFMTY1RjdGNEQ0OTAA",
      "timestamp": "2025-12-12T10:00:00.000Z"
    },
    {
      "id": "message-uuid-2",
      "conversationId": "550e8400-e29b-41d4-a716-446655440000",
      "text": "Bună ziua! Desigur, vă trimit factura imediat. Aveți un CUI?",
      "sender": "assistant",
      "whatsappMessageId": "wamid.HBgNNDA3MjEyMzQ1Njc4FQIAERgSQjE2N0JFMTY1RjdGNEQ0OTAB",
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

---

## Rute Trimitere Mesaje (Autentificate)

### POST /send
**Descriere**: Trimite un mesaj WhatsApp către un număr de telefon

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "to": "40712345678",
  "message": "Bună ziua! Vă mulțumim pentru comandă. Factura dumneavoastră este atașată.",
  "conversationId": "conversation-uuid-optional"
}
```

**Câmpuri**:
- `to` - număr de telefon destinatar (format internațional fără +)
- `message` - textul mesajului
- `conversationId` - opțional, UUID conversație existentă (se creează automat dacă lipsește)

**Răspuns** (200):
```json
{
  "success": true,
  "message": {
    "id": "message-uuid",
    "conversationId": "conversation-uuid",
    "text": "Bună ziua! Vă mulțumim pentru comandă...",
    "sender": "assistant",
    "whatsappMessageId": "wamid.HBgNNDA3MjEyMzQ1Njc4FQIAERgSQjE2N0JFMTY1RjdGNEQ0OTAB",
    "timestamp": "2025-12-12T10:30:00.000Z"
  },
  "whatsappMessageId": "wamid.HBgNNDA3MjEyMzQ1Njc4FQIAERgSQjE2N0JFMTY1RjdGNEQ0OTAB"
}
```

**Răspuns** (400) - parametri lipsă:
```json
{
  "error": "Numărul de telefon și mesajul sunt obligatorii"
}
```

**Răspuns** (500) - API WhatsApp neconfigurat:
```json
{
  "error": "WhatsApp API nu este configurat"
}
```

**Răspuns** (500) - eroare trimitere:
```json
{
  "error": "Eroare la trimiterea mesajului WhatsApp",
  "details": {
    "message": "Invalid phone number",
    "code": 100
  }
}
```

---

## Rate Limiting

Toate rutele autentificate sunt protejate de rate limiting:

- **Chat endpoints** (`POST /send`, `POST /conversations`):
  - `chatLimiter` - 20 requesturi pe minut

- **API endpoints** (`GET /conversations`, `GET /conversations/:id`, etc.):
  - `apiLimiter` - 100 requesturi pe 15 minute

**Răspuns Rate Limit** (429):
```json
{
  "error": "Prea multe cereri. Încercați mai târziu."
}
```

---

## Erori comune

### 401 Unauthorized
```json
{
  "error": "Token invalid sau lipsă"
}
```
**Soluție**: Verificați că ați inclus token-ul JWT valid în header `Authorization: Bearer <token>`

### 403 Forbidden (webhook)
**Cauză**: Token de verificare invalid
**Soluție**: Verificați că `WEBHOOK_VERIFY_TOKEN` din `.env` corespunde cu cel din Meta Developers

### 404 Not Found
```json
{
  "error": "Conversație WhatsApp negăsită"
}
```
**Soluție**: Verificați UUID-ul conversației

### 500 Internal Server Error
```json
{
  "error": "WhatsApp API nu este configurat"
}
```
**Soluție**: Configurați variabilele `WHATSAPP_PHONE_ID` și `WHATSAPP_TOKEN` în `.env`

---

## Exemple de utilizare

### JavaScript (Fetch API)

```javascript
// Trimitere mesaj WhatsApp
const sendWhatsAppMessage = async (phoneNumber, message) => {
  const response = await fetch('https://chatbill.ro/api/whatsapp/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      to: phoneNumber,
      message: message
    })
  });

  const data = await response.json();
  return data;
};

// Obținere conversații WhatsApp
const getWhatsAppConversations = async (page = 1) => {
  const response = await fetch(
    `https://chatbill.ro/api/whatsapp/conversations?page=${page}&limit=20`,
    {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }
  );

  const data = await response.json();
  return data;
};

// Obținere mesaje conversație
const getConversationMessages = async (conversationId) => {
  const response = await fetch(
    `https://chatbill.ro/api/whatsapp/conversations/${conversationId}/messages`,
    {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }
  );

  const data = await response.json();
  return data;
};
```

### cURL

```bash
# Trimitere mesaj
curl -X POST https://chatbill.ro/api/whatsapp/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "40712345678",
    "message": "Salut! Ți-am trimis factura."
  }'

# Obținere conversații
curl -X GET "https://chatbill.ro/api/whatsapp/conversations?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Obținere mesaje conversație
curl -X GET "https://chatbill.ro/api/whatsapp/conversations/CONVERSATION_UUID/messages" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Flow complet de utilizare

### 1. Primire mesaj WhatsApp de la client
```
Client (40712345678) trimite mesaj "Bună! Am nevoie de factură"
    ↓
Meta trimite webhook POST /api/whatsapp/webhook
    ↓
Server creează/găsește conversație pentru 40712345678
    ↓
Server salvează mesajul în DB
    ↓
(Opțional) Server trimite răspuns automat
```

### 2. Trimitere mesaj din aplicație
```
Aplicație → POST /api/whatsapp/send
    ↓
Server trimite mesaj prin WhatsApp API
    ↓
Server salvează mesajul în DB
    ↓
Client primește mesajul pe WhatsApp
```

### 3. Vizualizare conversații
```
Aplicație → GET /api/whatsapp/conversations
    ↓
Server returnează lista conversațiilor WhatsApp
    ↓
Aplicație → GET /api/whatsapp/conversations/:id/messages
    ↓
Server returnează istoric mesaje
```

---

## Notițe importante

1. **Format număr telefon**: Folosește formatul internațional FĂRĂ semnul `+`
   - ✅ Corect: `40712345678`
   - ❌ Greșit: `+40712345678` sau `0712345678`

2. **Conversații automate**: Când primești un mesaj de la un număr nou, conversația se creează automat

3. **WhatsApp Message ID**: Fiecare mesaj are un ID unic de la WhatsApp (`whatsappMessageId`) pentru tracking

4. **Timestamp-uri**: Toate timestamp-urile sunt în format ISO 8601 (UTC)

5. **Paginare**: Folosește parametrii `page` și `limit` pentru liste mari de conversații/mesaje
