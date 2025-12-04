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

// Generare PDF Proformă - folosește aceleași template-uri dar cu titlu "FACTURĂ PROFORMĂ"
function createProformaPDF(proforma, companySettings, template = 'modern') {
  return new Promise((resolve, reject) => {
    try {
      let docDefinition;
      
      if (template === 'professional') {
        docDefinition = generateProfessionalProforma(proforma, companySettings);
      } else {
        docDefinition = generateModernProforma(proforma, companySettings);
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

// Template Modern pentru Proformă
function generateModernProforma(proforma, companySettings) {
  const subtotal = proforma.items.reduce((sum, item) => sum + item.subtotal, 0);
  const totalVat = proforma.items.reduce((sum, item) => sum + item.vatAmount, 0);
  const total = subtotal + totalVat;
  
  const issueDate = new Date(proforma.issueDate).toLocaleDateString('ro-RO');
  const validUntil = new Date(proforma.validUntil).toLocaleDateString('ro-RO');
  
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
      // Header cu gradient albastru
      {
        canvas: [
          {
            type: 'rect',
            x: 0,
            y: 0,
            w: 515,
            h: 80,
            color: '#0052cc',
            linearGradient: ['#0052cc', '#0065ff']
          }
        ],
        absolutePosition: { x: 0, y: 0 }
      },
      
      // Titlu Proformă
      {
        text: 'FACTURĂ PROFORMĂ',
        style: 'header',
        color: 'white',
        alignment: 'center',
        margin: [0, 25, 0, 5]
      },
      {
        text: `Nr. ${proforma.proformaNumber}`,
        style: 'subheader',
        color: 'white',
        alignment: 'center',
        margin: [0, 0, 0, 20]
      },
      
      // Informații Furnizor și Client
      {
        margin: [0, 20, 0, 15],
        columns: [
          {
            width: '48%',
            stack: [
              { text: 'FURNIZOR', style: 'sectionTitle', color: '#0052cc' },
              { text: companySettings.name || '', style: 'companyName' },
              { text: `CUI: ${companySettings.cui || ''}`, style: 'text' },
              { text: `Reg. Com.: ${companySettings.regCom || ''}`, style: 'text' },
              { text: companySettings.address || '', style: 'text' },
              { text: `${companySettings.city || ''}, ${companySettings.county || ''}`, style: 'text' },
              { text: companySettings.phone || '', style: 'text' },
              { text: companySettings.email || '', style: 'text' }
            ]
          },
          {
            width: '4%',
            text: ''
          },
          {
            width: '48%',
            stack: [
              { text: 'CLIENT', style: 'sectionTitle', color: '#0052cc' },
              { text: proforma.clientName || '', style: 'companyName' },
              ...(proforma.clientType === 'company' ? [
                { text: `CUI: ${proforma.clientCUI || ''}`, style: 'text' },
                { text: `Reg. Com.: ${proforma.clientRegCom || ''}`, style: 'text' }
              ] : [
                { text: `CNP: ${proforma.clientCNP || ''}`, style: 'text' }
              ]),
              { text: proforma.clientAddress || '', style: 'text' },
              { text: `${proforma.clientCity || ''}, ${proforma.clientCounty || ''}`, style: 'text' }
            ]
          }
        ]
      },
      
      // Informații dată
      {
        margin: [0, 10, 0, 20],
        columns: [
          {
            width: '48%',
            stack: [
              { text: [{ text: 'Data emiterii: ', bold: true }, issueDate], style: 'text' }
            ]
          },
          {
            width: '4%',
            text: ''
          },
          {
            width: '48%',
            stack: [
              { text: [{ text: 'Valabilă până la: ', bold: true }, validUntil], style: 'text', color: '#d32f2f' }
            ]
          }
        ]
      },
      
      // Tabel produse
      {
        table: {
          headerRows: 1,
          widths: ['*', 50, 40, 70, 50, 80],
          body: [
            [
              { text: 'Descriere', style: 'tableHeader', fillColor: '#0052cc', color: 'white' },
              { text: 'U.M.', style: 'tableHeader', fillColor: '#0052cc', color: 'white' },
              { text: 'Cant.', style: 'tableHeader', fillColor: '#0052cc', color: 'white' },
              { text: 'Preț unitar', style: 'tableHeader', fillColor: '#0052cc', color: 'white' },
              { text: 'TVA %', style: 'tableHeader', fillColor: '#0052cc', color: 'white' },
              { text: 'Total', style: 'tableHeader', fillColor: '#0052cc', color: 'white' }
            ],
            ...proforma.items.map((item, index) => [
              { text: item.name, style: 'tableCell', fillColor: index % 2 === 0 ? '#f5f5f5' : 'white' },
              { text: item.unit, style: 'tableCell', fillColor: index % 2 === 0 ? '#f5f5f5' : 'white' },
              { text: item.quantity.toString(), style: 'tableCell', fillColor: index % 2 === 0 ? '#f5f5f5' : 'white' },
              { text: `${item.price.toFixed(2)} RON`, style: 'tableCell', fillColor: index % 2 === 0 ? '#f5f5f5' : 'white' },
              { text: `${(item.vatRate * 100).toFixed(0)}%`, style: 'tableCell', fillColor: index % 2 === 0 ? '#f5f5f5' : 'white' },
              { text: `${item.total.toFixed(2)} RON`, style: 'tableCell', fillColor: index % 2 === 0 ? '#f5f5f5' : 'white', bold: true }
            ])
          ]
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => '#e0e0e0',
          vLineColor: () => '#e0e0e0'
        }
      },
      
      // Totaluri
      {
        margin: [0, 20, 0, 0],
        columns: [
          { width: '*', text: '' },
          {
            width: 200,
            stack: [
              {
                canvas: [
                  {
                    type: 'rect',
                    x: 0,
                    y: 0,
                    w: 200,
                    h: 90,
                    color: '#0052cc',
                    linearGradient: ['#0052cc', '#0065ff']
                  }
                ]
              },
              {
                margin: [10, -80, 10, 0],
                stack: [
                  {
                    columns: [
                      { text: 'Subtotal:', color: 'white', fontSize: 10 },
                      { text: `${subtotal.toFixed(2)} RON`, color: 'white', fontSize: 10, alignment: 'right', bold: true }
                    ]
                  },
                  {
                    margin: [0, 5, 0, 0],
                    columns: [
                      { text: 'TVA:', color: 'white', fontSize: 10 },
                      { text: `${totalVat.toFixed(2)} RON`, color: 'white', fontSize: 10, alignment: 'right', bold: true }
                    ]
                  },
                  {
                    margin: [0, 8, 0, 0],
                    canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 1, lineColor: 'white' }]
                  },
                  {
                    margin: [0, 8, 0, 0],
                    columns: [
                      { text: 'TOTAL:', color: 'white', fontSize: 12, bold: true },
                      { text: `${total.toFixed(2)} RON`, color: 'white', fontSize: 14, alignment: 'right', bold: true }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },
      
      // Notă validitate
      {
        margin: [0, 20, 0, 0],
        text: [
          { text: 'Notă: ', bold: true, color: '#d32f2f' },
          { text: 'Această factură proformă nu constituie un document fiscal. Este o ofertă comercială valabilă până la data specificată.', color: '#666', fontSize: 9 }
        ]
      }
    ],
    
    styles: {
      header: {
        fontSize: 24,
        bold: true
      },
      subheader: {
        fontSize: 14
      },
      sectionTitle: {
        fontSize: 10,
        bold: true,
        margin: [0, 0, 0, 5]
      },
      companyName: {
        fontSize: 12,
        bold: true,
        margin: [0, 0, 0, 3]
      },
      text: {
        fontSize: 9,
        margin: [0, 2, 0, 0]
      },
      tableHeader: {
        fontSize: 9,
        bold: true,
        alignment: 'center',
        margin: [0, 5, 0, 5]
      },
      tableCell: {
        fontSize: 9,
        margin: [5, 5, 5, 5]
      }
    },
    
    defaultStyle: {
      font: 'Roboto'
    }
  };
  
  return docDefinition;
}

// Template Professional pentru Proformă
function generateProfessionalProforma(proforma, companySettings) {
  const subtotal = proforma.items.reduce((sum, item) => sum + item.subtotal, 0);
  const totalVat = proforma.items.reduce((sum, item) => sum + item.vatAmount, 0);
  const total = subtotal + totalVat;
  
  const issueDate = new Date(proforma.issueDate).toLocaleDateString('ro-RO');
  const validUntil = new Date(proforma.validUntil).toLocaleDateString('ro-RO');
  
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
      // Titlu elegant
      {
        text: 'FACTURĂ PROFORMĂ',
        style: 'proHeader',
        alignment: 'center',
        margin: [0, 0, 0, 5]
      },
      {
        text: `Nr. ${proforma.proformaNumber}`,
        style: 'proSubheader',
        alignment: 'center',
        margin: [0, 0, 0, 25]
      },
      
      // Linie separator
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: 515,
            y2: 0,
            lineWidth: 2,
            lineColor: '#1a237e'
          }
        ],
        margin: [0, 0, 0, 20]
      },
      
      // Informații Furnizor și Client
      {
        columns: [
          {
            width: '48%',
            stack: [
              { text: 'FURNIZOR', style: 'proSectionTitle' },
              { text: companySettings.name || '', style: 'proCompanyName' },
              { text: `CUI: ${companySettings.cui || ''}`, style: 'proText' },
              { text: `Reg. Com.: ${companySettings.regCom || ''}`, style: 'proText' },
              { text: companySettings.address || '', style: 'proText' },
              { text: `${companySettings.city || ''}, ${companySettings.county || ''}`, style: 'proText' },
              { text: companySettings.phone || '', style: 'proText' },
              { text: companySettings.email || '', style: 'proText' }
            ]
          },
          {
            width: '4%',
            text: ''
          },
          {
            width: '48%',
            stack: [
              { text: 'CLIENT', style: 'proSectionTitle' },
              { text: proforma.clientName || '', style: 'proCompanyName' },
              ...(proforma.clientType === 'company' ? [
                { text: `CUI: ${proforma.clientCUI || ''}`, style: 'proText' },
                { text: `Reg. Com.: ${proforma.clientRegCom || ''}`, style: 'proText' }
              ] : [
                { text: `CNP: ${proforma.clientCNP || ''}`, style: 'proText' }
              ]),
              { text: proforma.clientAddress || '', style: 'proText' },
              { text: `${proforma.clientCity || ''}, ${proforma.clientCounty || ''}`, style: 'proText' }
            ]
          }
        ],
        margin: [0, 0, 0, 15]
      },
      
      // Informații dată
      {
        margin: [0, 10, 0, 20],
        columns: [
          {
            width: '48%',
            stack: [
              { text: [{ text: 'Data emiterii: ', bold: true, color: '#1a237e' }, issueDate], style: 'proText' }
            ]
          },
          {
            width: '4%',
            text: ''
          },
          {
            width: '48%',
            stack: [
              { text: [{ text: 'Valabilă până la: ', bold: true, color: '#1a237e' }, validUntil], style: 'proText' }
            ]
          }
        ]
      },
      
      // Tabel produse
      {
        table: {
          headerRows: 1,
          widths: ['*', 50, 40, 70, 50, 80],
          body: [
            [
              { text: 'Descriere', style: 'proTableHeader' },
              { text: 'U.M.', style: 'proTableHeader' },
              { text: 'Cant.', style: 'proTableHeader' },
              { text: 'Preț unitar', style: 'proTableHeader' },
              { text: 'TVA %', style: 'proTableHeader' },
              { text: 'Total', style: 'proTableHeader' }
            ],
            ...proforma.items.map((item, index) => [
              { text: item.name, style: 'proTableCell' },
              { text: item.unit, style: 'proTableCell' },
              { text: item.quantity.toString(), style: 'proTableCell' },
              { text: `${item.price.toFixed(2)} RON`, style: 'proTableCell' },
              { text: `${(item.vatRate * 100).toFixed(0)}%`, style: 'proTableCell' },
              { text: `${item.total.toFixed(2)} RON`, style: 'proTableCell', bold: true }
            ])
          ]
        },
        layout: {
          hLineWidth: (i, node) => i === 0 || i === 1 ? 1 : 0.5,
          vLineWidth: () => 0,
          hLineColor: () => '#1a237e',
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6
        }
      },
      
      // Totaluri
      {
        margin: [0, 20, 0, 0],
        columns: [
          { width: '*', text: '' },
          {
            width: 200,
            stack: [
              {
                columns: [
                  { text: 'Subtotal:', style: 'proTotalLabel' },
                  { text: `${subtotal.toFixed(2)} RON`, style: 'proTotalValue' }
                ]
              },
              {
                margin: [0, 5, 0, 0],
                columns: [
                  { text: 'TVA:', style: 'proTotalLabel' },
                  { text: `${totalVat.toFixed(2)} RON`, style: 'proTotalValue' }
                ]
              },
              {
                margin: [0, 8, 0, 0],
                canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 2, lineColor: '#1a237e' }]
              },
              {
                margin: [0, 8, 0, 0],
                columns: [
                  { text: 'TOTAL:', style: 'proGrandTotalLabel' },
                  { text: `${total.toFixed(2)} RON`, style: 'proGrandTotalValue' }
                ]
              }
            ]
          }
        ]
      },
      
      // Notă validitate
      {
        margin: [0, 30, 0, 0],
        text: [
          { text: 'Notă: ', bold: true, color: '#1a237e', fontSize: 10 },
          { text: 'Această factură proformă nu constituie un document fiscal. Este o ofertă comercială valabilă până la data specificată.', color: '#666', fontSize: 9 }
        ]
      }
    ],
    
    styles: {
      proHeader: {
        fontSize: 24,
        bold: true,
        color: '#1a237e'
      },
      proSubheader: {
        fontSize: 14,
        color: '#1a237e'
      },
      proSectionTitle: {
        fontSize: 10,
        bold: true,
        color: '#1a237e',
        margin: [0, 0, 0, 8]
      },
      proCompanyName: {
        fontSize: 12,
        bold: true,
        color: '#263238',
        margin: [0, 0, 0, 4]
      },
      proText: {
        fontSize: 9,
        color: '#546e7a',
        margin: [0, 2, 0, 0]
      },
      proTableHeader: {
        fontSize: 9,
        bold: true,
        color: '#1a237e',
        fillColor: '#f5f5f5',
        alignment: 'center'
      },
      proTableCell: {
        fontSize: 8,
        color: '#263238'
      },
      proTotalLabel: {
        fontSize: 10,
        color: '#546e7a'
      },
      proTotalValue: {
        fontSize: 10,
        alignment: 'right',
        bold: true,
        color: '#263238'
      },
      proGrandTotalLabel: {
        fontSize: 12,
        bold: true,
        color: '#1a237e'
      },
      proGrandTotalValue: {
        fontSize: 14,
        alignment: 'right',
        bold: true,
        color: '#1a237e'
      }
    },
    
    defaultStyle: {
      font: 'Roboto'
    }
  };
  
  return docDefinition;
}

module.exports = {
  createPDF,
  createProformaPDF
};

