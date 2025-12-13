const prisma = require('../db/prismaWrapper');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const {
  renderModernTemplate,
  renderClassicTemplate
} = require('../services/pdfTemplates');

// Director pentru salvarea proformelor PDF
const proformasDir = path.join(__dirname, '../../proformas');
if (!fs.existsSync(proformasDir)) {
  fs.mkdirSync(proformasDir, { recursive: true });
}

// Generare număr proformă unic
function generateProformaNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PF${year}${month}${day}${random}`;
}

// Controler Proforma
module.exports = {
	// Generează o proformă nouă
	async createProforma(req, res) {
		console.log('🔵 createProforma apelat cu body:', JSON.stringify(req.body, null, 2));
		try {
			if (!prisma) {
				console.log('❌ Prisma nu este disponibil');
				return res.status(503).json({ 
					success: false, 
					error: 'Baza de date nu este configurată' 
				});
			}

			const { client, products, template: requestTemplate } = req.body;
			const userId = req.user?.id; // Optional - poate fi null pentru useri neautentificați

			// Validare date client
			if (!client || !products || products.length === 0) {
				console.log('❌ Validare eșuată - lipsesc date');
				return res.status(400).json({ 
					success: false, 
					error: 'Informațiile despre client și produse sunt obligatorii' 
				});
			}

			// Obține setările companiei
			let companySettings = null;

			if (userId) {
				companySettings = await prisma.companySettings.findUnique({
					where: { userId }
				});
			}

			if (!companySettings) {
				console.log('⚠️ Nu există setări companie, folosim valorile implicite');
				companySettings = {
					companyName: 'Compania Ta SRL',
					name: 'Compania Ta SRL',
					cui: '12345678',
					regCom: 'J00/1234/2024',
					address: 'Str. Exemplu, Nr. 1',
					city: 'București',
					county: 'București',
					email: 'contact@companie.ro',
					phone: '+40 123 456 789',
					iban: 'RO00BANK0000000000000000',
					bank: 'Banca Exemplu',
					proformaTemplate: 'modern',
					isVatPayer: true,
					vatRate: 19,
					proformaSeries: 'PRO',
					proformaStartNumber: 1
				};
			}
		}

	// Determină template-ul final (folosește proformaTemplate)
	const finalTemplate = requestTemplate || companySettings.proformaTemplate || 'modern';
	console.log('🔵 Template final selectat pentru proformă:', finalTemplate);		// Verifică dacă compania este plătitoare de TVA
		const isVatPayer = companySettings.isVatPayer !== false; // default true
		const vatRateFromSettings = companySettings.vatRate || 19;
		
		console.log('🔵 Setări TVA - Plătitor:', isVatPayer, 'Cotă:', vatRateFromSettings + '%');

		// Calculează totaluri pentru fiecare produs
		const itemsData = products.map(product => {
			const quantity = parseFloat(product.quantity);
			const price = parseFloat(product.price);
			
			// Dacă nu e plătitor de TVA, TVA = 0
			const vatRate = isVatPayer ? (parseFloat(product.vat) / 100) : 0;
			
			const subtotal = quantity * price;
			const vatAmount = subtotal * vatRate;
			const total = subtotal + vatAmount;

			return {
				name: product.name,
				unit: product.unit || 'buc',
				quantity,
				price,
				vatRate,
				subtotal,
				vatAmount,
				total
			};
		});

		// Calculează totaluri generale
		const proformaSubtotal = itemsData.reduce((sum, item) => sum + item.subtotal, 0);
		const proformaVatAmount = isVatPayer ? itemsData.reduce((sum, item) => sum + item.vatAmount, 0) : 0;
		const proformaTotal = proformaSubtotal + proformaVatAmount;
		
		// Generare număr proformă bazat pe setări
		const proformaSeries = companySettings.proformaSeries || 'PRO';
		const startNumber = companySettings.proformaStartNumber || 1;
		
		// Găsește ultima proformă pentru acest user
		const lastProforma = await prisma.proforma.findFirst({
			where: { userId },
			orderBy: { createdAt: 'desc' }
		});
		
		let proformaNumber;
		if (lastProforma && lastProforma.proformaNumber) {
			// Extrage numărul din ultima proformă
			const match = lastProforma.proformaNumber.match(/(\d+)$/);
			if (match) {
				const lastNum = parseInt(match[1]);
				proformaNumber = `${proformaSeries}-${(lastNum + 1).toString().padStart(4, '0')}`;
			} else {
				proformaNumber = `${proformaSeries}-${startNumber.toString().padStart(4, '0')}`;
			}
		} else {
			proformaNumber = `${proformaSeries}-${startNumber.toString().padStart(4, '0')}`;
		}

		// Pregătește datele pentru proformă
		const proformaData = {
			proformaNumber,
			subtotal: proformaSubtotal,
			tvaAmount: proformaVatAmount,
				total: proformaTotal,
				issueDate: new Date(),
				status: 'draft',
				template: finalTemplate,
				
				// Date emitent (din setări)
				providerName: companySettings.companyName || companySettings.name || '',
				providerCUI: companySettings.cui || '',
				providerRegCom: companySettings.regCom || '',
				providerAddress: companySettings.address || '',
				providerCity: companySettings.city || '',
				providerCounty: companySettings.county || '',
				providerPhone: companySettings.phone || '',
				providerEmail: companySettings.email || '',
				providerBank: companySettings.bank || '',
				providerIban: companySettings.iban || '',
				providerCapital: companySettings.capital || '',
				
				// Date client/beneficiar
				clientType: client.type,
				clientName: client.type === 'company' ? client.name : `${client.firstName} ${client.lastName}`,
				clientCUI: client.type === 'company' ? client.cui : null,
				clientRegCom: client.type === 'company' ? client.regCom : null,
				clientCNP: client.type === 'individual' ? client.cnp : null,
				clientFirstName: client.type === 'individual' ? client.firstName : null,
				clientLastName: client.type === 'individual' ? client.lastName : null,
				clientAddress: client.address || '',
				clientCity: client.city || '',
				clientCounty: client.county || '',
				
				// Produse/servicii
				items: {
					create: itemsData
				}
			};

			// Salvare proformă în baza de date
			console.log('🔵 Se salvează proforma în DB...');
			const proforma = await prisma.proforma.create({
				data: proformaData,
				include: {
					items: true
				}
			});
			console.log('✅ Proforma salvată cu ID:', proforma.id);

			const proformaFileName = `proforma_${proformaNumber}.pdf`;
			const proformaPath = path.join(proformasDir, proformaFileName);

			// Generare PDF pentru proformă
			const doc = new PDFDocument({ margin: 50, size: 'A4' });
			const stream = fs.createWriteStream(proformaPath);
			doc.pipe(stream);

			// Creează un obiect compatibil cu template-urile de invoice
			const proformaForTemplate = {
				...proforma,
				number: proforma.proformaNumber, // alias pentru compatibilitate
				date: proforma.issueDate
			};

			const companyForTemplate = {
				...companySettings,
				name: companySettings.companyName || companySettings.name
			};

			// Randează template-ul selectat
			switch (finalTemplate) {
				case 'classic':
					renderClassicTemplate(doc, proformaForTemplate, companyForTemplate, true); // true = isProforma
					break;
				default:
					renderModernTemplate(doc, proformaForTemplate, companyForTemplate, true);
			}

			doc.end();

			await new Promise((resolve, reject) => {
				stream.on('finish', resolve);
				stream.on('error', reject);
			});

			// Actualizează cu calea PDF
			const updatedProforma = await prisma.proforma.update({
				where: { id: proforma.id },
				data: { pdfPath: `/proformas/${proformaFileName}` },
				include: {
					items: true
				}
			});

			console.log(`✅ Proforma ${proformaNumber} generată cu succes`);
			res.json({
				success: true,
				proforma: updatedProforma
			});

		} catch (error) {
			console.error('❌ Eroare creare proformă:', error);
			console.error('❌ Stack:', error.stack);
			res.status(500).json({ 
				success: false, 
				error: 'Eroare la generarea proformei',
				details: error.message
			});
		}
	},

	// Returnează lista de proforme (cu paginare)
	async getProformas(req, res) {
		console.log('🔵 getProformas apelat');
		try {
			if (!prisma) {
				console.log('❌ Prisma nu este disponibil');
				return res.status(503).json({
					success: false,
					error: 'Baza de date nu este configurată'
				});
			}

			const { getPaginationParams, getSortParams, formatPaginatedResponse } = require('../utils/pagination');

			// Get pagination params from query (validated by Zod middleware)
			const { page, limit, sortBy, sortOrder } = req.query;
			const { skip, take, page: currentPage, limit: currentLimit } = getPaginationParams(page, limit);
			const orderBy = getSortParams(sortBy, sortOrder, 'createdAt');

			// Get userId from authenticated user
			const userId = req.user?.id;
			const whereClause = userId ? { userId } : {};

			// Get total count
			const total = await prisma.proforma.count({ where: whereClause });

			// Get paginated proformas
			const proformas = await prisma.proforma.findMany({
				where: whereClause,
				skip,
				take,
				orderBy,
				include: {
					items: true
				}
			});

			console.log(`✅ Găsite ${proformas.length} proforme din ${total} (pagina ${currentPage})`);
			res.json(formatPaginatedResponse(proformas, total, currentPage, currentLimit));
		} catch (error) {
			console.error('❌ Eroare obținere proforme:', error);
			res.status(500).json({
				success: false,
				error: 'Eroare la obținerea proformelor'
			});
		}
	},

	// Returnează o proformă după ID
	async getProforma(req, res) {
		try {
			if (!prisma) {
				return res.status(503).json({ 
					success: false, 
					error: 'Baza de date nu este configurată' 
				});
			}

			const { id } = req.params;
			
			const proforma = await prisma.proforma.findUnique({
				where: { id: parseInt(id) }
			});

			if (!proforma) {
				return res.status(404).json({ 
					success: false, 
					error: 'Proforma nu a fost găsită' 
				});
			}

			res.json({
				success: true,
				proforma
			});
		} catch (error) {
			console.error('❌ Eroare obținere proformă:', error);
			res.status(500).json({ 
				success: false, 
				error: 'Eroare la obținerea proformei' 
			});
		}
	},

	// Descarcă proforma PDF
	async downloadProforma(req, res) {
		try {
			if (!prisma) {
				return res.status(503).json({ 
					success: false, 
					error: 'Baza de date nu este configurată' 
				});
			}

			const { id } = req.params;
			
			const proforma = await prisma.proforma.findUnique({
				where: { id: parseInt(id) }
			});

			if (!proforma) {
				return res.status(404).json({ 
					success: false, 
					error: 'Proforma nu a fost găsită' 
				});
			}

			const filePath = path.join(__dirname, '../..', proforma.pdfPath);
			
			if (!fs.existsSync(filePath)) {
				return res.status(404).json({ 
					success: false, 
					error: 'Fișierul PDF nu a fost găsit' 
				});
			}

			res.download(filePath, `proforma_${proforma.proformaNumber}.pdf`);
		} catch (error) {
			console.error('❌ Eroare download proformă:', error);
			res.status(500).json({ 
				success: false, 
				error: 'Eroare la descărcarea proformei' 
			});
		}
	}
};
