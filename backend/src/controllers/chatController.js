const prisma = require('../db/prismaWrapper');

// Handle Socket.IO connection
function handleSocketConnection(socket, io) {
  console.log('Client conectat:', socket.id);

  socket.on('joinConversation', (conversationId) => {
    socket.join(conversationId);
    console.log(`Socket ${socket.id} s-a alăturat conversației ${conversationId}`);
  });

  socket.on('sendMessage', async (messageData) => {
    try {
      if (!prisma) {
        socket.emit('error', { message: 'Baza de date nu este configurată' });
        return;
      }
      
      // Salvează mesajul în baza de date
      const message = await prisma.message.create({
        data: {
          conversationId: messageData.conversationId,
          text: messageData.text,
          sender: messageData.sender || 'user',
          userId: messageData.userId || null
        }
      });

      // Actualizează conversația
      await prisma.conversation.update({
        where: { id: messageData.conversationId },
        data: { updatedAt: new Date() }
      });
      
      // Trimite mesajul către toți clienții din conversație
      io.to(messageData.conversationId).emit('message', message);
    } catch (error) {
      console.error('Eroare salvare mesaj:', error);
      socket.emit('error', { message: 'Eroare la salvarea mesajului' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client deconectat:', socket.id);
  });
}

// Creare conversație nouă
async function createConversation(req, res) {
  try {
    const { title, companyId, userId } = req.body;
    
    const conversation = await prisma.conversation.create({
      data: {
        title: title || `Conversație ${new Date().toLocaleDateString('ro-RO')}`,
        companyId: companyId || null,
        userId: userId || null
      },
      include: {
        company: true,
        _count: {
          select: { messages: true }
        }
      }
    });
    
    res.status(201).json(conversation);
  } catch (error) {
    console.error('Eroare creare conversație:', error);
    res.status(500).json({ error: 'Eroare la crearea conversației' });
  }
}

// Obține toate conversațiile
async function getConversations(req, res) {
  try {
    const conversations = await prisma.conversation.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        company: true,
        _count: {
          select: { messages: true }
        }
      }
    });
    
    res.json(conversations);
  } catch (error) {
    console.error('Eroare obținere conversații:', error);
    res.status(500).json({ error: 'Eroare la obținerea conversațiilor' });
  }
}

// Obține o conversație specifică
async function getConversation(req, res) {
  try {
    const { id } = req.params;
    
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        company: true,
        _count: {
          select: { messages: true }
        }
      }
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversație negăsită' });
    }
    
    res.json(conversation);
  } catch (error) {
    console.error('Eroare obținere conversație:', error);
    res.status(500).json({ error: 'Eroare la obținerea conversației' });
  }
}

// Obține mesajele unei conversații
async function getConversationMessages(req, res) {
  try {
    const { id } = req.params;
    
    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { timestamp: 'asc' }
    });
    
    res.json(messages);
  } catch (error) {
    console.error('Eroare obținere mesaje:', error);
    res.status(500).json({ error: 'Eroare la obținerea mesajelor' });
  }
}

module.exports = {
  handleSocketConnection,
  createConversation,
  getConversations,
  getConversation,
  getConversationMessages
};
