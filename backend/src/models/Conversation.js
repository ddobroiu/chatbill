const { v4: uuidv4 } = require('uuid');

class Conversation {
  constructor(title) {
    this.id = uuidv4();
    this.title = title || `Conversație ${new Date().toLocaleDateString('ro-RO')}`;
    this.messages = [];
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  addMessage(message) {
    this.messages.push(message);
    this.updatedAt = new Date().toISOString();
  }

  getMessages() {
    return this.messages;
  }

  getMessageCount() {
    return this.messages.length;
  }
}

module.exports = Conversation;
