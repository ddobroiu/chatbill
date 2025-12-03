const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
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

// Use routes
app.use('/api/auth', authRoutes); // Rute autentificare
app.use('/api/chat', chatRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ai-chat', aiChatRoutes);
app.use('/api/anaf', anafAuthRoutes);

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
    message: err.message
  });
});

server.listen(PORT, () => {
  console.log(`Server-ul rulează pe portul ${PORT}`);
});
