const { v4: uuidv4 } = require('uuid');

class Invoice {
  constructor(conversationId, conversationTitle, messageCount) {
    this.id = uuidv4();
    this.invoiceNumber = this.generateInvoiceNumber();
    this.conversationId = conversationId;
    this.conversationTitle = conversationTitle;
    this.messageCount = messageCount;
    this.pricePerMessage = 0.50; // RON per mesaj
    this.total = this.calculateTotal();
    this.createdAt = new Date().toISOString();
    this.status = 'generated'; // generated, sent, paid
  }

  generateInvoiceNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}${month}${day}-${random}`;
  }

  calculateTotal() {
    const subtotal = this.messageCount * this.pricePerMessage;
    const tva = subtotal * 0.19; // TVA 19%
    return (subtotal + tva).toFixed(2);
  }

  toJSON() {
    return {
      id: this.id,
      invoiceNumber: this.invoiceNumber,
      conversationId: this.conversationId,
      conversationTitle: this.conversationTitle,
      messageCount: this.messageCount,
      pricePerMessage: this.pricePerMessage,
      subtotal: (this.messageCount * this.pricePerMessage).toFixed(2),
      tva: (this.messageCount * this.pricePerMessage * 0.19).toFixed(2),
      total: this.total,
      createdAt: this.createdAt,
      status: this.status
    };
  }
}

module.exports = Invoice;
