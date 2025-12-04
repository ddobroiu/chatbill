const path = require('path');
const fs = require('fs');

// Folosim pdfmake cu fonturile virtuale
const pdfMake = require('pdfmake/build/pdfmake');
const vfs = require('pdfmake/build/vfs_fonts');

// Setează fonturile virtuale
pdfMake.vfs = vfs;

console.log('✅ pdfmake încărcat cu fonturile Roboto');

// Template Modern - Gradient albastru, profesional
function generateModernInvoice(invoice, companySettings) {
  // Calculăm totalurile
  const subtotal = invoice.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const totalVat = invoice.items.reduce((sum, item) => {
    const itemTotal = item.quantity * item.price;
    return sum + (itemTotal * (item.vat / 100));
  }, 0);
  const total = subtotal + totalVat;
  
  const invoiceDate = new Date(invoice.date).toLocaleDateString('ro-RO');
  const dueDate = new Date(invoice.dueDate).toLocaleDateString('ro-RO');
  
  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 60],
    
    header: function(currentPage, pageCount) {
      return {
        margin: [40, 20, 40, 0],
        columns: [
          { text: `Pagina ${currentPage} din ${pageCount}`, fontSize: 8, color: '#888', alignment: 'right' }
        ]
      };
    },
    
    footer: function(currentPage, pageCount) {
      return {
        margin: [40, 10, 40, 0],
        columns: [
          { 
            text: 'Generată cu ChatBill - Sistem automat de facturare', 
            fontSize: 8, 
            color: '#888', 
            alignment: 'center' 
          }
        ]
      };
    },
    
    content: [
      // Header albastru cu gradient
      {
        canvas: [
          {
            type: 'rect',
            x: -40,
            y: -40,
            w: 595 - 80 + 80,
            h: 140,
            color: '#0052cc',
            opacity: 1
          }
        ]
      },
      
      // Logo placeholder (cerc alb transparent)
      {
        canvas: [
          {
            type: 'ellipse',
            x: 20,
            y: -15,
            r1: 25,
            r2: 25,
            color: '#ffffff',
            opacity: 0.3
          }
        ],
        absolutePosition: { x: 40, y: 50 }
      },
      
      // Nume companie (sus stânga)
      {
        text: companySettings.name || 'COMPANIA MEA',
        fontSize: 22,
        bold: true,
        color: '#ffffff',
        absolutePosition: { x: 95, y: 48 }
      },
      
      // Detalii companie
      {
        stack: [
          { text: `CUI: ${companySettings.cui || 'N/A'}`, fontSize: 9, color: '#ffffff', opacity: 0.9 },
          { text: `Reg. Com: ${companySettings.regCom || 'N/A'}`, fontSize: 9, color: '#ffffff', opacity: 0.9, margin: [0, 2, 0, 0] },
          { text: companySettings.address || 'Adresa', fontSize: 9, color: '#ffffff', opacity: 0.9, margin: [0, 2, 0, 0] },
          { text: `${companySettings.city || 'Oraș'}, ${companySettings.county || 'Județ'}`, fontSize: 9, color: '#ffffff', opacity: 0.9, margin: [0, 2, 0, 0] }
        ],
        absolutePosition: { x: 95, y: 75 }
      },
      
      // FACTURA (dreapta sus)
      {
        text: 'FACTURĂ',
        fontSize: 13,
        bold: true,
        color: '#ffffff',
        alignment: 'right',
        absolutePosition: { x: 40, y: 48 },
        width: 515
      },
      
      // Număr factură (mare, accent)
      {
        text: `#${invoice.number}`,
        fontSize: 24,
        bold: true,
        color: '#00b8d9',
        alignment: 'right',
        absolutePosition: { x: 40, y: 65 },
        width: 515
      },
      
      // Date factură
      {
        stack: [
          { text: `Data: ${invoiceDate}`, fontSize: 9, color: '#ffffff', opacity: 0.9, alignment: 'right' },
          { text: `Scadență: ${dueDate}`, fontSize: 9, color: '#ffffff', opacity: 0.9, margin: [0, 2, 0, 0], alignment: 'right' }
        ],
        absolutePosition: { x: 40, y: 105 },
        width: 515
      },
      
      // Linie accent cyan
      {
        canvas: [
          {
            type: 'rect',
            x: -40,
            y: 0,
            w: 595 - 80 + 80,
            h: 4,
            color: '#00b8d9'
          }
        ],
        margin: [0, 0, 0, 20]
      },
      
      // Spațiu după header
      { text: '', margin: [0, 20, 0, 0] },
      
      // Client info
      {
        text: 'FACTURAT CĂTRE:',
        fontSize: 10,
        bold: true,
        color: '#172b4d',
        margin: [0, 0, 0, 8]
      },
      
      {
        text: invoice.clientName || 'Client necunoscut',
        fontSize: 11,
        bold: true,
        color: '#172b4d',
        margin: [0, 0, 0, 6]
      },
      
      {
        stack: [
          invoice.clientCUI ? { text: `CUI: ${invoice.clientCUI}`, fontSize: 9, color: '#172b4d', opacity: 0.8 } : null,
          invoice.clientRegCom ? { text: `Reg. Com: ${invoice.clientRegCom}`, fontSize: 9, color: '#172b4d', opacity: 0.8, margin: [0, 2, 0, 0] } : null,
          invoice.clientAddress ? { text: invoice.clientAddress, fontSize: 9, color: '#172b4d', opacity: 0.8, margin: [0, 2, 0, 0] } : null,
          invoice.clientCity && invoice.clientCounty ? { text: `${invoice.clientCity}, ${invoice.clientCounty}`, fontSize: 9, color: '#172b4d', opacity: 0.8, margin: [0, 2, 0, 0] } : null
        ].filter(Boolean),
        margin: [0, 0, 0, 25]
      },
      
      // Tabel produse
      {
        table: {
          headerRows: 1,
          widths: [30, '*', 50, 65, 40, 80],
          body: [
            // Header
            [
              { text: 'Nr.', style: 'tableHeader' },
              { text: 'Descriere', style: 'tableHeader' },
              { text: 'Cant.', style: 'tableHeader', alignment: 'right' },
              { text: 'Preț', style: 'tableHeader', alignment: 'right' },
              { text: 'TVA', style: 'tableHeader', alignment: 'right' },
              { text: 'Total', style: 'tableHeader', alignment: 'right' }
            ],
            // Produse
            ...invoice.items.map((item, index) => {
              const itemTotal = item.quantity * item.price;
              const itemVat = itemTotal * (item.vat / 100);
              const itemTotalWithVat = itemTotal + itemVat;
              
              return [
                { text: index + 1, style: 'tableCell' },
                { text: item.name, style: 'tableCell' },
                { text: item.quantity.toString(), style: 'tableCell', alignment: 'right' },
                { text: `${item.price.toFixed(2)} RON`, style: 'tableCell', alignment: 'right' },
                { text: `${item.vat}%`, style: 'tableCell', alignment: 'right' },
                { text: `${itemTotalWithVat.toFixed(2)} RON`, style: 'tableCell', alignment: 'right', bold: true }
              ];
            })
          ]
        },
        layout: {
          fillColor: function(rowIndex, node, columnIndex) {
            return rowIndex === 0 ? '#f4f5f7' : (rowIndex % 2 === 0 ? '#fafbfc' : null);
          },
          hLineWidth: function(i, node) {
            return i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5;
          },
          vLineWidth: function(i, node) {
            return 0;
          },
          hLineColor: function(i, node) {
            return i === 0 || i === 1 ? '#0052cc' : '#dfe1e6';
          },
          paddingLeft: function(i, node) { return 8; },
          paddingRight: function(i, node) { return 8; },
          paddingTop: function(i, node) { return 6; },
          paddingBottom: function(i, node) { return 6; }
        }
      },
      
      // Totaluri
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 200,
            stack: [
              {
                columns: [
                  { text: 'Subtotal:', fontSize: 10, alignment: 'right', width: 100 },
                  { text: `${subtotal.toFixed(2)} RON`, fontSize: 10, alignment: 'right', width: 100 }
                ],
                margin: [0, 15, 0, 0]
              },
              {
                columns: [
                  { text: 'TVA:', fontSize: 10, alignment: 'right', width: 100 },
                  { text: `${totalVat.toFixed(2)} RON`, fontSize: 10, alignment: 'right', width: 100 }
                ],
                margin: [0, 8, 0, 0]
              },
              {
                canvas: [
                  {
                    type: 'rect',
                    x: 0,
                    y: 0,
                    w: 200,
                    h: 40,
                    color: '#0052cc',
                    r: 4
                  }
                ],
                margin: [0, 12, 0, 0]
              },
              {
                columns: [
                  { text: 'TOTAL:', fontSize: 13, bold: true, color: '#ffffff', alignment: 'right', width: 100 },
                  { text: `${total.toFixed(2)} RON`, fontSize: 13, bold: true, color: '#ffffff', alignment: 'right', width: 100 }
                ],
                absolutePosition: { x: 395 - 40, y: null },
                margin: [0, -32, 0, 0]
              }
            ]
          }
        ]
      }
    ],
    
    styles: {
      tableHeader: {
        bold: true,
        fontSize: 9,
        color: '#172b4d',
        fillColor: '#f4f5f7'
      },
      tableCell: {
        fontSize: 9,
        color: '#172b4d'
      }
    },
    
    defaultStyle: {
      font: 'Roboto'
    }
  };
  
  return docDefinition;
}

// Template Professional - Elegant, minimalist
function generateProfessionalInvoice(invoice, companySettings) {
  const subtotal = invoice.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const totalVat = invoice.items.reduce((sum, item) => {
    const itemTotal = item.quantity * item.price;
    return sum + (itemTotal * (item.vat / 100));
  }, 0);
  const total = subtotal + totalVat;
  
  const invoiceDate = new Date(invoice.date).toLocaleDateString('ro-RO');
  const dueDate = new Date(invoice.dueDate).toLocaleDateString('ro-RO');
  
  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [50, 50, 50, 60],
    
    header: function(currentPage, pageCount) {
      return {
        margin: [50, 20, 50, 0],
        columns: [
          { text: `Pagina ${currentPage}/${pageCount}`, fontSize: 8, color: '#666', alignment: 'right' }
        ]
      };
    },
    
    footer: function(currentPage, pageCount) {
      return {
        margin: [50, 10, 50, 0],
        text: 'ChatBill | Sistem profesional de facturare | contact@chatbill.ro',
        fontSize: 7,
        color: '#999',
        alignment: 'center'
      };
    },
    
    content: [
      // Header elegant cu linie
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: companySettings.name || 'COMPANIA MEA', fontSize: 20, bold: true, color: '#1a237e' },
              { text: `CUI: ${companySettings.cui || 'N/A'} | Reg. Com: ${companySettings.regCom || 'N/A'}`, fontSize: 8, color: '#666', margin: [0, 4, 0, 0] },
              { text: companySettings.address || 'Adresa', fontSize: 8, color: '#666', margin: [0, 2, 0, 0] },
              { text: `${companySettings.city || 'Oraș'}, ${companySettings.county || 'Județ'}`, fontSize: 8, color: '#666', margin: [0, 2, 0, 0] }
            ]
          },
          {
            width: 150,
            stack: [
              { 
                text: 'FACTURĂ', 
                fontSize: 11, 
                bold: true, 
                color: '#1a237e', 
                alignment: 'right'
              },
              { 
                text: `#${invoice.number}`, 
                fontSize: 18, 
                bold: true, 
                color: '#3949ab', 
                alignment: 'right',
                margin: [0, 4, 0, 0]
              },
              {
                canvas: [
                  {
                    type: 'rect',
                    x: 0,
                    y: 8,
                    w: 150,
                    h: 50,
                    color: '#eceff1',
                    r: 4
                  }
                ]
              },
              {
                stack: [
                  { text: `Data: ${invoiceDate}`, fontSize: 8, color: '#666', alignment: 'center' },
                  { text: `Scadență: ${dueDate}`, fontSize: 8, color: '#666', margin: [0, 2, 0, 0], alignment: 'center' }
                ],
                margin: [0, -38, 0, 0]
              }
            ]
          }
        ],
        margin: [0, 0, 0, 20]
      },
      
      // Linie separare
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: 495,
            y2: 0,
            lineWidth: 2,
            lineColor: '#3949ab'
          }
        ],
        margin: [0, 0, 0, 25]
      },
      
      // Client
      {
        text: 'CLIENT:',
        fontSize: 9,
        bold: true,
        color: '#1a237e',
        margin: [0, 0, 0, 6]
      },
      
      {
        text: invoice.clientName || 'Client necunoscut',
        fontSize: 11,
        bold: true,
        color: '#263238',
        margin: [0, 0, 0, 4]
      },
      
      {
        stack: [
          invoice.clientCUI ? { text: `CUI: ${invoice.clientCUI}`, fontSize: 8, color: '#666' } : null,
          invoice.clientRegCom ? { text: `Reg. Com: ${invoice.clientRegCom}`, fontSize: 8, color: '#666', margin: [0, 2, 0, 0] } : null,
          invoice.clientAddress ? { text: invoice.clientAddress, fontSize: 8, color: '#666', margin: [0, 2, 0, 0] } : null,
          invoice.clientCity && invoice.clientCounty ? { text: `${invoice.clientCity}, ${invoice.clientCounty}`, fontSize: 8, color: '#666', margin: [0, 2, 0, 0] } : null
        ].filter(Boolean),
        margin: [0, 0, 0, 20]
      },
      
      // Tabel
      {
        table: {
          headerRows: 1,
          widths: [25, '*', 45, 60, 35, 75],
          body: [
            [
              { text: '#', style: 'proTableHeader' },
              { text: 'Produs/Serviciu', style: 'proTableHeader' },
              { text: 'Cant.', style: 'proTableHeader', alignment: 'right' },
              { text: 'Preț', style: 'proTableHeader', alignment: 'right' },
              { text: 'TVA', style: 'proTableHeader', alignment: 'right' },
              { text: 'Total', style: 'proTableHeader', alignment: 'right' }
            ],
            ...invoice.items.map((item, index) => {
              const itemTotal = item.quantity * item.price;
              const itemVat = itemTotal * (item.vat / 100);
              const itemTotalWithVat = itemTotal + itemVat;
              
              return [
                { text: index + 1, style: 'proTableCell' },
                { text: item.name, style: 'proTableCell' },
                { text: item.quantity, style: 'proTableCell', alignment: 'right' },
                { text: item.price.toFixed(2), style: 'proTableCell', alignment: 'right' },
                { text: `${item.vat}%`, style: 'proTableCell', alignment: 'right' },
                { text: `${itemTotalWithVat.toFixed(2)} RON`, style: 'proTableCell', alignment: 'right', bold: true }
              ];
            })
          ]
        },
        layout: {
          fillColor: function(rowIndex) {
            return rowIndex === 0 ? '#1a237e' : (rowIndex % 2 === 0 ? '#f5f5f5' : null);
          },
          hLineWidth: function(i, node) {
            return i === 0 || i === 1 || i === node.table.body.length ? 1 : 0;
          },
          vLineWidth: function() { return 0; },
          hLineColor: function(i) {
            return i === 0 || i === 1 ? '#1a237e' : '#ccc';
          },
          paddingLeft: function() { return 8; },
          paddingRight: function() { return 8; },
          paddingTop: function() { return 5; },
          paddingBottom: function() { return 5; }
        }
      },
      
      // Totaluri
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 180,
            stack: [
              {
                columns: [
                  { text: 'Subtotal:', fontSize: 9, alignment: 'right', width: 90 },
                  { text: `${subtotal.toFixed(2)} RON`, fontSize: 9, alignment: 'right', width: 90 }
                ],
                margin: [0, 12, 0, 0]
              },
              {
                columns: [
                  { text: 'TVA:', fontSize: 9, alignment: 'right', width: 90 },
                  { text: `${totalVat.toFixed(2)} RON`, fontSize: 9, alignment: 'right', width: 90 }
                ],
                margin: [0, 6, 0, 0]
              },
              {
                canvas: [
                  {
                    type: 'rect',
                    x: 0,
                    y: 10,
                    w: 180,
                    h: 35,
                    color: '#1a237e',
                    r: 4
                  }
                ]
              },
              {
                columns: [
                  { text: 'TOTAL:', fontSize: 12, bold: true, color: '#ffffff', alignment: 'right', width: 90 },
                  { text: `${total.toFixed(2)} RON`, fontSize: 12, bold: true, color: '#ffffff', alignment: 'right', width: 90 }
                ],
                margin: [0, -28, 0, 0]
              }
            ]
          }
        ]
      }
    ],
    
    styles: {
      proTableHeader: {
        bold: true,
        fontSize: 8,
        color: '#ffffff'
      },
      proTableCell: {
        fontSize: 8,
        color: '#263238'
      }
    },
    
    defaultStyle: {
      font: 'Roboto'
    }
  };
  
  return docDefinition;
}

// Generare PDF efectivă
function createPDF(invoice, companySettings, template = 'modern') {
  return new Promise((resolve, reject) => {
    try {
      let docDefinition;
      
      if (template === 'professional') {
        docDefinition = generateProfessionalInvoice(invoice, companySettings);
      } else {
        docDefinition = generateModernInvoice(invoice, companySettings);
      }
      
      const pdfDoc = pdfMake.createPdf(docDefinition);
      
      // Generăm buffer-ul PDF
      pdfDoc.getBuffer((buffer) => {
        resolve(buffer);
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  createPDF
};
