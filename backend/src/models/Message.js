const { v4: uuidv4 } = require('uuid');

class Message {
  constructor(conversationId, text, sender = 'user') {
    this.id = uuidv4();
    this.conversationId = conversationId;
    this.text = text;
    this.sender = sender; // 'user' sau 'system'
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      conversationId: this.conversationId,
      text: this.text,
      sender: this.sender,
      timestamp: this.timestamp
    };
  }
}

module.exports = Message;
