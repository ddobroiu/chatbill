const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// CORS Configuration - Allow only specific origins
const allowedOrigins = [
  process.env.FRONTEND_URL || 'https://chatbill.ro',
  'http://localhost:3000', // Pentru development local
  'http://localhost:5173', // Pentru Vite dev server
];

const corsOptions = {
  origin: function (origin, callback) {
    // Permite requests fără origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

const io = socketIo(server, {
  cors: corsOptions
});

// Middleware
app.use(cors(corsOptions));

// IMPORTANT: Store raw body for Stripe webhook verification BEFORE json middleware
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }), (req, res, next) => {
  req.rawBody = req.body;
  next();
});

// JSON middleware for all other routes
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../frontend')));

// Servire statică pentru invoices și proformas
app.use('/invoices', express.static(path.join(__dirname, '../invoices')));
app.use('/proformas', express.static(path.join(__dirname, '../proformas')));

// Session middleware pentru OAuth
app.use(session({
  secret: process.env.SESSION_SECRET || 'chatbill-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS în producție
    maxAge: 24 * 60 * 60 * 1000 // 24 ore
  }
}));

// Global rate limiting (applies to all routes except webhooks)
const { apiLimiter } = require('./middleware/rateLimiter');
// Skip rate limiting for webhook routes (they have their own limiter)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/webhooks')) {
    return next();
  }
  apiLimiter(req, res, next);
});

// Structured logging middleware
const logger = require('./config/logger');
const requestLogger = require('./middleware/requestLogger');
app.use(requestLogger);

// Basic console logging for development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.url}`);
    next();
  });
}

// Import routes
const chatRoutes = require('./routes/chatRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const proformaRoutes = require('./routes/proformaRoutes');
const offerRoutes = require('./routes/offerRoutes');
const companyRoutes = require('./routes/companyRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const aiChatRoutes = require('./routes/aiChat');
const anafAuthRoutes = require('./routes/anafAuth');
const authRoutes = require('./routes/auth');
const gptChatRoutes = require('./routes/gptChat');
const webhookRoutes = require('./routes/webhookRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const previewRoutes = require('./routes/previewRoutes');

// Use routes
// IMPORTANT: Webhook routes MUST come before json middleware (already handled above)
app.use('/api/webhooks', webhookRoutes);

app.use('/api/auth', authRoutes); // Rute autentificare
app.use('/api/chat', chatRoutes);
app.use('/api/whatsapp', whatsappRoutes); // Rute WhatsApp
app.use('/api/invoices', invoiceRoutes);
app.use('/api/proformas', proformaRoutes); // Rute proforma
app.use('/api/offers', offerRoutes); // Rute oferte
app.use('/api/companies', companyRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ai-chat', aiChatRoutes);
app.use('/api/anaf', anafAuthRoutes);
app.use('/api/gpt-chat', gptChatRoutes); // GPT Chat inteligent
app.use('/api/subscriptions', subscriptionRoutes); // Stripe subscriptions
app.use('/api/preview', previewRoutes); // Preview PDF

// Socket.IO pentru chat în timp real
const { handleSocketConnection } = require('./controllers/chatController');
io.on('connection', (socket) => handleSocketConnection(socket, io));

// Handle 404 routes
app.use((req, res, next) => {
  const { NotFoundError } = require('./utils/errors');
  next(new NotFoundError('Rută', req.originalUrl));
});

// Global error handler - MUST be last
const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server-ul rulează pe portul ${PORT}`);
});
