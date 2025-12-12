const pdfService = require('../../services/pdfService');
const prisma = require('../db/prismaWrapper');

/**
 * Preview factură în browser (HTML)
 * GET /api/invoices/:id/preview?template=modern-minimal
 */
async function previewInvoice(req, res) {
    try {
        const { id } = req.params;
        const template = req.query.template || 'modern-minimal';

        console.log(`[PDF Controller] Preview invoice ${id} with template ${template}`);

        // Caută factura în baza de date
        const invoice = await prisma.invoice.findUnique({
            where: { id: parseInt(id) },
            include: {
                user: {
                    include: {
                        settings: true
                    }
                }
            }
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                error: 'Factură negăsită'
            });
        }

        // Pregătește datele companiei
        const company = invoice.user?.settings || {};

        // Pregătește datele pentru TVA
        const vatSettings = {
            isVatPayer: company.isVatPayer !== false,
            vatRate: company.vatRate || 21
        };

        // Generează HTML
        const data = pdfService.prepareInvoiceData(invoice, company, vatSettings);
        const html = await pdfService.renderTemplate(template, data);

        // Trimite HTML ca răspuns
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);

    } catch (error) {
        console.error('[PDF Controller] Eroare preview:', error);
        res.status(500).json({
            success: false,
            error: 'Eroare la generarea preview-ului'
        });
    }
}

/**
 * Download factură PDF
 * GET /api/invoices/:id/pdf?template=modern-minimal
 */
async function downloadInvoicePDF(req, res) {
    try {
        const { id } = req.params;
        const template = req.query.template || 'modern-minimal';

        console.log(`[PDF Controller] Generate PDF for invoice ${id} with template ${template}`);

        // Caută factura în baza de date
        const invoice = await prisma.invoice.findUnique({
            where: { id: parseInt(id) },
            include: {
                user: {
                    include: {
                        settings: true
                    }
                }
            }
        });

        if (!invoice) {
            return res.status(404).json({
                success: false,
                error: 'Factură negăsită'
            });
        }

        // Pregătește datele companiei
        const company = invoice.user?.settings || {};

        // Pregătește datele pentru TVA
        const vatSettings = {
            isVatPayer: company.isVatPayer !== false,
            vatRate: company.vatRate || 21
        };

        // Generează PDF
        const { pdfBuffer } = await pdfService.createInvoicePDF(
            invoice,
            company,
            vatSettings,
            template
        );

        // Trimite PDF ca download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Factura_${invoice.invoiceNumber}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('[PDF Controller] Eroare generare PDF:', error);
        res.status(500).json({
            success: false,
            error: 'Eroare la generarea PDF-ului'
        });
    }
}

/**
 * Preview factură din date (fără salvare în DB) - pentru test
 * POST /api/invoices/preview
 */
async function previewInvoiceFromData(req, res) {
    try {
        const { invoice, client, products, company, template: requestTemplate } = req.body;
        const template = requestTemplate || 'modern-minimal';

        console.log(`[PDF Controller] Preview from data with template ${template}`);

        // Pregătește datele pentru factură
        const invoiceData = {
            invoiceNumber: invoice?.invoiceNumber || 'PREVIEW001',
            issueDate: invoice?.issueDate || new Date().toLocaleDateString('ro-RO'),
            dueDate: invoice?.dueDate,
            status: invoice?.status || 'unpaid',
            client,
            products
        };

        // Setări TVA
        const vatSettings = {
            isVatPayer: company?.isVatPayer !== false,
            vatRate: company?.vatRate || 21
        };

        // Generează HTML
        const data = pdfService.prepareInvoiceData(invoiceData, company || {}, vatSettings);
        const html = await pdfService.renderTemplate(template, data);

        // Trimite HTML ca răspuns
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);

    } catch (error) {
        console.error('[PDF Controller] Eroare preview din date:', error);
        res.status(500).json({
            success: false,
            error: 'Eroare la generarea preview-ului',
            details: error.message
        });
    }
}

/**
 * Generează PDF din date (fără salvare în DB) - pentru test
 * POST /api/invoices/generate-pdf
 */
async function generatePDFFromData(req, res) {
    try {
        const { invoice, client, products, company, template: requestTemplate } = req.body;
        const template = requestTemplate || 'modern-minimal';

        console.log(`[PDF Controller] Generate PDF from data with template ${template}`);

        // Pregătește datele pentru factură
        const invoiceData = {
            invoiceNumber: invoice?.invoiceNumber || 'PREVIEW001',
            issueDate: invoice?.issueDate || new Date().toLocaleDateString('ro-RO'),
            dueDate: invoice?.dueDate,
            status: invoice?.status || 'unpaid',
            client,
            products
        };

        // Setări TVA
        const vatSettings = {
            isVatPayer: company?.isVatPayer !== false,
            vatRate: company?.vatRate || 21
        };

        // Generează PDF
        const { pdfBuffer } = await pdfService.createInvoicePDF(
            invoiceData,
            company || {},
            vatSettings,
            template
        );

        // Trimite PDF ca download
        const filename = `Factura_${invoiceData.invoiceNumber}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('[PDF Controller] Eroare generare PDF din date:', error);
        res.status(500).json({
            success: false,
            error: 'Eroare la generarea PDF-ului',
            details: error.message
        });
    }
}

module.exports = {
    previewInvoice,
    downloadInvoicePDF,
    previewInvoiceFromData,
    generatePDFFromData
};
