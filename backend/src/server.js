const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
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

// Import routes
const chatRoutes = require('./routes/chatRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const companyRoutes = require('./routes/companyRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

// Use routes
app.use('/api/chat', chatRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/settings', settingsRoutes);

// Socket.IO pentru chat în timp real
const { handleSocketConnection } = require('./controllers/chatController');
io.on('connection', (socket) => handleSocketConnection(socket, io));

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server-ul rulează pe portul ${PORT}`);
});
