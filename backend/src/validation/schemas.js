const { z } = require('zod');

// Common schemas
const emailSchema = z.string().email('Email invalid');
const passwordSchema = z.string().min(8, 'Parola trebuie să aibă minimum 8 caractere');
const cuiSchema = z.string().regex(/^[0-9]{2,10}$/, 'CUI invalid (doar cifre, 2-10 caractere)');
const ibanSchema = z.string().regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/, 'IBAN invalid').optional();
const phoneSchema = z.string().regex(/^[0-9+\s()-]{6,20}$/, 'Număr de telefon invalid').optional();

// Auth schemas
const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Parolele nu se potrivesc',
  path: ['confirmPassword']
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Parola este obligatorie')
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token invalid')
});

const requestResetSchema = z.object({
  email: emailSchema
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token invalid'),
  password: passwordSchema,
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Parolele nu se potrivesc',
  path: ['confirmPassword']
});

// Company schemas
const addressSchema = z.object({
  street: z.string().min(1, 'Strada este obligatorie'),
  city: z.string().min(1, 'Orașul este obligatoriu'),
  county: z.string().min(1, 'Județul este obligatoriu'),
  country: z.string().default('România'),
  postalCode: z.string().optional()
});

const companySchema = z.object({
  name: z.string().min(1, 'Numele companiei este obligatoriu'),
  cui: cuiSchema,
  registrationNumber: z.string().optional(),
  address: addressSchema,
  phone: phoneSchema,
  email: emailSchema.optional(),
  bankName: z.string().optional(),
  iban: ibanSchema,
  legalRepresentative: z.string().optional()
});

// Client schemas (for invoices/proformas)
const clientSchema = z.object({
  type: z.enum(['company', 'individual'], {
    errorMap: () => ({ message: 'Tipul clientului trebuie să fie "company" sau "individual"' })
  }),
  // Company fields
  name: z.string().min(1, 'Numele este obligatoriu').optional(),
  cui: z.string().optional(),
  registrationNumber: z.string().optional(),
  // Individual fields
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  cnp: z.string().regex(/^[0-9]{13}$/, 'CNP invalid').optional(),
  idSeries: z.string().optional(),
  idNumber: z.string().optional(),
  // Common fields
  address: addressSchema,
  phone: phoneSchema,
  email: emailSchema.optional()
}).refine(data => {
  if (data.type === 'company') {
    return data.name && data.cui;
  } else {
    return data.firstName && data.lastName;
  }
}, {
  message: 'Date client incomplete',
  path: ['type']
});

// Product/Item schema
const itemSchema = z.object({
  description: z.string().min(1, 'Descrierea este obligatorie'),
  unit: z.string().min(1, 'Unitatea de măsură este obligatorie'),
  quantity: z.number().positive('Cantitatea trebuie să fie pozitivă'),
  unitPrice: z.number().min(0, 'Prețul unitar nu poate fi negativ'),
  vatRate: z.number().min(0).max(100, 'Cota TVA trebuie să fie între 0 și 100').default(19),
  vatAmount: z.number().min(0).optional(),
  total: z.number().min(0).optional()
});

// Invoice schema
const createInvoiceSchema = z.object({
  provider: companySchema,
  client: clientSchema,
  items: z.array(itemSchema).min(1, 'Trebuie să existe cel puțin un produs/serviciu'),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().datetime().or(z.date()).optional(),
  dueDate: z.string().datetime().or(z.date()).optional(),
  subtotal: z.number().min(0).optional(),
  totalVat: z.number().min(0).optional(),
  total: z.number().positive('Totalul trebuie să fie pozitiv').optional(),
  notes: z.string().optional(),
  template: z.enum(['modern', 'classic', 'minimal', 'elegant']).default('modern'),
  currency: z.string().default('RON'),
  language: z.string().default('ro')
});

// Proforma schema (similar to invoice)
const createProformaSchema = z.object({
  provider: companySchema,
  client: clientSchema,
  items: z.array(itemSchema).min(1, 'Trebuie să existe cel puțin un produs/serviciu'),
  proformaNumber: z.string().optional(),
  proformaDate: z.string().datetime().or(z.date()).optional(),
  validUntil: z.string().datetime().or(z.date()).optional(),
  subtotal: z.number().min(0).optional(),
  totalVat: z.number().min(0).optional(),
  total: z.number().positive('Totalul trebuie să fie pozitiv').optional(),
  notes: z.string().optional(),
  template: z.enum(['modern', 'classic', 'minimal', 'elegant']).default('modern'),
  currency: z.string().default('RON'),
  language: z.string().default('ro'),
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'converted']).default('draft')
});

// Settings schema
const updateSettingsSchema = z.object({
  companyName: z.string().min(1).optional(),
  cui: cuiSchema.optional(),
  registrationNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  phone: phoneSchema,
  email: emailSchema.optional(),
  bankName: z.string().optional(),
  iban: ibanSchema,
  legalRepresentative: z.string().optional(),
  defaultTemplate: z.enum(['modern', 'classic', 'minimal', 'elegant']).optional(),
  invoicePrefix: z.string().optional(),
  invoiceStartNumber: z.number().int().positive().optional(),
  // VAT settings
  isVatPayer: z.boolean().optional(),
  vatRate: z.number().min(0).max(100).optional(),
  // Document series
  invoiceSeries: z.string().optional(),
  proformaSeries: z.string().optional(),
  quoteSeries: z.string().optional(),
  proformaStartNumber: z.number().int().positive().optional(),
  quoteStartNumber: z.number().int().positive().optional()
});

// Chat schemas
const createConversationSchema = z.object({
  title: z.string().min(1, 'Titlul este obligatoriu').optional(),
  companyId: z.number().int().positive().optional()
});

const sendMessageSchema = z.object({
  conversationId: z.number().int().positive('ID conversație invalid'),
  content: z.string().min(1, 'Mesajul nu poate fi gol'),
  sender: z.enum(['user', 'system', 'ai']).default('user')
});

// Pagination schema
const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive().max(100)).default('10'),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// ID param schema
const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID invalid').transform(Number)
});

// CUI param schema
const cuiParamSchema = z.object({
  cui: cuiSchema
});

// Subscription schemas
const checkoutSchema = z.object({
  priceId: z.string().min(1, 'Price ID este obligatoriu'),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional()
});

module.exports = {
  // Auth
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  requestResetSchema,
  resetPasswordSchema,

  // Company
  companySchema,
  addressSchema,
  clientSchema,

  // Documents
  itemSchema,
  createInvoiceSchema,
  createProformaSchema,

  // Settings
  updateSettingsSchema,

  // Chat
  createConversationSchema,
  sendMessageSchema,

  // Common
  paginationSchema,
  idParamSchema,
  cuiParamSchema,
  emailSchema,
  passwordSchema,
  cuiSchema,
  ibanSchema,
  phoneSchema,

  // Subscription
  checkoutSchema
};
