const puppeteer = require('puppeteer');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs').promises;

class PDFService {
    constructor() {
        this.browser = null;
        this.templates = {
            'modern-minimal': path.join(__dirname, '../templates/modern-minimal/invoice.ejs'),
            'professional-clean': path.join(__dirname, '../templates/professional-clean/invoice.ejs')
        };
    }

    /**
     * Inițializează browser-ul Puppeteer (refolosit pentru performanță)
     */
    async initBrowser() {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu'
                ]
            });
        }
        return this.browser;
    }

    /**
     * Calculează totaluri pentru factură
     */
    calculateTotals(products, isVatPayer = true) {
        let subtotal = 0;
        let totalVat = 0;

        products.forEach(product => {
            const lineSubtotal = product.quantity * product.price;
            subtotal += lineSubtotal;

            if (isVatPayer && product.vat) {
                const lineVat = lineSubtotal * (product.vat / 100);
                totalVat += lineVat;
            }
        });

        const total = subtotal + totalVat;

        return {
            subtotal,
            totalVat,
            total
        };
    }

    /**
     * Pregătește datele pentru template
     */
    prepareInvoiceData(invoiceData, company, vatSettings) {
        const isVatPayer = vatSettings && vatSettings.isVatPayer !== false;

        // Calculează totaluri
        const totals = this.calculateTotals(invoiceData.products, isVatPayer);

        return {
            invoice: {
                invoiceNumber: invoiceData.invoiceNumber,
                issueDate: invoiceData.issueDate || new Date().toLocaleDateString('ro-RO'),
                dueDate: invoiceData.dueDate,
                status: invoiceData.status || 'unpaid',
                isVatPayer,
                ...totals
            },
            company: {
                name: company.name || 'Compania Mea SRL',
                cui: company.cui || '',
                regCom: company.regCom || '',
                address: company.address || '',
                city: company.city || '',
                county: company.county || '',
                phone: company.phone || '',
                email: company.email || '',
                iban: company.iban || '',
                bank: company.bank || '',
                capital: company.capital || '',
                logo: company.logo || null
            },
            client: invoiceData.client || {},
            products: invoiceData.products || []
        };
    }

    /**
     * Generează HTML din template
     */
    async renderTemplate(templateName, data) {
        const templatePath = this.templates[templateName];

        if (!templatePath) {
            throw new Error(`Template "${templateName}" nu există. Disponibile: ${Object.keys(this.templates).join(', ')}`);
        }

        try {
            const templateContent = await fs.readFile(templatePath, 'utf-8');
            const html = ejs.render(templateContent, data);
            return html;
        } catch (error) {
            console.error('Eroare renderizare template:', error);
            throw new Error(`Eroare la renderizarea template-ului: ${error.message}`);
        }
    }

    /**
     * Generează PDF din HTML
     */
    async generatePDF(html, options = {}) {
        const browser = await this.initBrowser();
        const page = await browser.newPage();

        try {
            // Setează conținutul HTML
            await page.setContent(html, {
                waitUntil: ['networkidle0', 'domcontentloaded']
            });

            // Așteaptă fonturile să se încarce
            await page.evaluateHandle('document.fonts.ready');

            // Generează PDF
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '24mm',
                    right: '16mm',
                    bottom: '24mm',
                    left: '16mm'
                },
                ...options
            });

            return pdfBuffer;
        } finally {
            await page.close();
        }
    }

    /**
     * Procesează invoice complet: date → HTML → PDF
     */
    async createInvoicePDF(invoiceData, company, vatSettings, templateName = 'modern-minimal') {
        console.log('[PDF Service] Creating PDF for invoice:', invoiceData.invoiceNumber);
        console.log('[PDF Service] Template:', templateName);

        // Pregătește datele
        const data = this.prepareInvoiceData(invoiceData, company, vatSettings);

        // Renderizează HTML
        const html = await this.renderTemplate(templateName, data);

        // Generează PDF
        const pdfBuffer = await this.generatePDF(html);

        console.log('[PDF Service] PDF generated successfully');

        return {
            pdfBuffer,
            html
        };
    }

    /**
     * Închide browser-ul (la shutdown)
     */
    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

// Singleton instance
const pdfService = new PDFService();

// Cleanup la exit
process.on('exit', () => {
    pdfService.close();
});

process.on('SIGINT', async () => {
    await pdfService.close();
    process.exit(0);
});

module.exports = pdfService;
