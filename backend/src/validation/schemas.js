const { z } = require('zod');

// Common schemas
const emailSchema = z.string().email('Email invalid');
const passwordSchema = z.string().min(6, 'Parola trebuie să aibă minimum 6 caractere');
const cuiSchema = z.string().regex(/^[0-9]{2,10}$/, 'CUI invalid (doar cifre, 2-10 caractere)');
const ibanSchema = z.string().regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/, 'IBAN invalid').optional();
const phoneSchema = z.string().regex(/^[0-9+\s()-]{6,20}$/, 'Număr de telefon invalid').optional();

// Auth schemas
const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  cui: cuiSchema,
  company: z.string().min(1, 'Numele firmei este obligatoriu').optional()
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

// Client schemas (for invoices/proformas) - FLEXIBIL pentru frontend
const clientSchema = z.object({
  type: z.enum(['company', 'individual'], {
    errorMap: () => ({ message: 'Tipul clientului trebuie să fie "company" sau "individual"' })
  }),
  // Company fields
  name: z.string().min(1, 'Numele este obligatoriu').optional(),
  cui: z.string().optional(),
  registrationNumber: z.string().optional(),
  regCom: z.string().optional(), // alias pentru registrationNumber
  // Individual fields
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  cnp: z.string().optional(), // mai permisiv
  idSeries: z.string().optional(),
  idNumber: z.string().optional(),
  // Common fields - acceptă atât obiect cât și string
  address: z.union([addressSchema, z.string()]).optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  phone: z.string().optional(), // mai permisiv
  email: z.string().optional()
}).passthrough(); // permite câmpuri suplimentare

// Product/Item schema - FLEXIBIL pentru frontend (acceptă și "name"/"price" și "description"/"unitPrice")
const itemSchema = z.object({
  description: z.string().min(1, 'Descrierea este obligatorie').optional(),
  name: z.string().min(1, 'Numele este obligatoriu').optional(), // alias pentru description
  unit: z.string().min(1, 'Unitatea de măsură este obligatorie'),
  quantity: z.number().positive('Cantitatea trebuie să fie pozitivă'),
  unitPrice: z.number().min(0, 'Prețul unitar nu poate fi negativ').optional(),
  price: z.number().min(0, 'Prețul nu poate fi negativ').optional(), // alias pentru unitPrice
  vatRate: z.number().min(0).max(100, 'Cota TVA trebuie să fie între 0 și 100').optional(),
  vat: z.number().min(0).max(100).optional(), // alias pentru vatRate
  vatAmount: z.number().min(0).optional(),
  total: z.number().min(0).optional()
}).passthrough().refine(data => data.name || data.description, {
  message: 'Trebuie să existe nume sau descriere',
  path: ['name']
}).refine(data => data.price !== undefined || data.unitPrice !== undefined, {
  message: 'Trebuie să existe preț',
  path: ['price']
});

// Invoice schema - FLEXIBIL pentru frontend
const createInvoiceSchema = z.object({
  provider: z.any().optional(), // mai permisiv - controller-ul va prelua din DB sau default
  client: clientSchema,
  items: z.array(itemSchema).min(1, 'Trebuie să existe cel puțin un produs/serviciu').optional(),
  products: z.array(itemSchema).min(1, 'Trebuie să existe cel puțin un produs/serviciu').optional(), // alias pentru items
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().datetime().or(z.date()).optional(),
  dueDate: z.string().datetime().or(z.date()).optional(),
  subtotal: z.number().min(0).optional(),
  totalVat: z.number().min(0).optional(),
  total: z.number().positive('Totalul trebuie să fie pozitiv').optional(),
  notes: z.string().optional(),
  template: z.enum(['modern', 'classic', 'minimal', 'elegant']).optional(),
  currency: z.string().default('RON'),
  language: z.string().default('ro')
}).passthrough().refine(data => data.items || data.products, {
  message: 'Trebuie să existe items sau products',
  path: ['items']
});

// Proforma schema (similar to invoice) - FLEXIBIL pentru frontend
const createProformaSchema = z.object({
  provider: z.any().optional(), // mai permisiv - controller-ul va prelua din DB sau default
  client: clientSchema,
  items: z.array(itemSchema).min(1, 'Trebuie să existe cel puțin un produs/serviciu').optional(),
  products: z.array(itemSchema).min(1, 'Trebuie să există cel puțin un produs/serviciu').optional(), // alias pentru items
  proformaNumber: z.string().optional(),
  proformaDate: z.string().datetime().or(z.date()).optional(),
  validUntil: z.string().datetime().or(z.date()).optional(),
  subtotal: z.number().min(0).optional(),
  totalVat: z.number().min(0).optional(),
  total: z.number().positive('Totalul trebuie să fie pozitiv').optional(),
  notes: z.string().optional(),
  template: z.enum(['modern', 'classic', 'minimal', 'elegant']).optional(),
  currency: z.string().default('RON'),
  language: z.string().default('ro'),
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'converted']).default('draft')
}).passthrough().refine(data => data.items || data.products, {
  message: 'Trebuie să existe items sau products',
  path: ['items']
});

// Settings schema
const updateSettingsSchema = z.object({
  name: z.string().min(1).optional(),
  cui: cuiSchema.optional(),
  regCom: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  phone: phoneSchema,
  email: emailSchema.optional(),
  bank: z.string().optional(),
  iban: ibanSchema,
  capital: z.string().optional(),
  legalRep: z.string().optional(),
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
