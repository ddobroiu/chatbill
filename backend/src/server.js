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
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../frontend')));

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

// Logging middleware
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

// Import routes
const chatRoutes = require('./routes/chatRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const companyRoutes = require('./routes/companyRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const aiChatRoutes = require('./routes/aiChat');
const anafAuthRoutes = require('./routes/anafAuth');
const authRoutes = require('./routes/auth');
const gptChatRoutes = require('./routes/gptChat');

// Use routes
app.use('/api/auth', authRoutes); // Rute autentificare
app.use('/api/chat', chatRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ai-chat', aiChatRoutes);
app.use('/api/anaf', anafAuthRoutes);
app.use('/api/gpt-chat', gptChatRoutes); // GPT Chat inteligent

// Socket.IO pentru chat în timp real
const { handleSocketConnection } = require('./controllers/chatController');
io.on('connection', (socket) => handleSocketConnection(socket, io));

const PORT = process.env.PORT || 3000;

// Error handlers
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({
    success: false,
    error: 'Eroare internă server',
    message: process.env.NODE_ENV === 'production' ? 'A apărut o eroare. Te rugăm să încerci din nou.' : err.message
  });
});

server.listen(PORT, () => {
  console.log(`Server-ul rulează pe portul ${PORT}`);
});
