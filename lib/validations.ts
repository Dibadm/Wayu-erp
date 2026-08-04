import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const productSchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(50),
  name: z.string().min(1, 'Product name is required').max(200),
  description: z.string().optional(),
  category: z.string().default('General'),
  quantity: z.number().int().min(0, 'Quantity cannot be negative'),
  minStockLevel: z.number().int().min(0, 'Min stock level cannot be negative'),
  unit: z.string().default('units'),
})

export const movementSchema = z.object({
  productId: z.string().cuid('Invalid product ID'),
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  notes: z.string().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type ProductInput = z.infer<typeof productSchema>
export type MovementInput = z.infer<typeof movementSchema>

// ─── v2.1 Supplier & PO schemas ───────────────────────────────────────────────

export const supplierSchema = z.object({
  name:          z.string().min(1, 'Company name is required').max(200),
  contactPerson: z.string().optional(),
  email:         z.string().email().optional().or(z.literal('')),
  phone:         z.string().optional(),
  address:       z.string().optional(),
  taxNumber:     z.string().optional(),
  notes:         z.string().optional(),
  status:        z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
})

export const purchaseOrderSchema = z.object({
  supplierId:       z.string().cuid(),
  expectedDelivery: z.string().datetime().optional(),
  notes:            z.string().optional(),
  items: z.array(z.object({
    productId:       z.string().cuid(),
    quantityOrdered: z.number().int().min(1),
    unitCost:        z.number().min(0),
    batchNumber:     z.string().optional(),
    expiryDate:      z.string().datetime().optional(),
    notes:           z.string().optional(),
  })).min(1, 'At least one item is required'),
})

export const poStatusSchema = z.object({
  status: z.enum(['DRAFT','PENDING','APPROVED','ORDERED','PARTIALLY_RECEIVED','COMPLETED','CANCELLED']),
  notes:  z.string().optional(),
})

export const receiveItemsSchema = z.object({
  locationId: z.string().cuid(),
  items: z.array(z.object({
    purchaseOrderItemId: z.string().cuid(),
    quantityReceived:    z.number().int().min(1),
    batchNumber:         z.string().optional(),
    expiryDate:          z.string().datetime().optional(),
  })).min(1),
})

export const productPricingSchema = z.object({
  costPrice:    z.number().min(0).optional(),
  sellingPrice: z.number().min(0).optional(),
})

export type SupplierInput        = z.infer<typeof supplierSchema>
export type PurchaseOrderInput   = z.infer<typeof purchaseOrderSchema>
export type POStatusInput        = z.infer<typeof poStatusSchema>
export type ReceiveItemsInput    = z.infer<typeof receiveItemsSchema>

// ─── POS v2.2 ─────────────────────────────────────────────────────────────────

export const customerSchema = z.object({
  name:    z.string().min(1, 'Name is required').max(200),
  phone:   z.string().max(30).optional(),
  email:   z.string().email().optional().or(z.literal('')),
  address: z.string().max(500).optional(),
  notes:   z.string().max(1000).optional(),
})

export const checkoutItemSchema = z.object({
  productId: z.string().cuid(),
  quantity:  z.number().int().min(1),
  unitPrice: z.number().min(0),   // can be overridden at POS
  discount:  z.number().min(0).default(0),
})

export const checkoutSchema = z.object({
  items:          z.array(checkoutItemSchema).min(1, 'Cart cannot be empty'),
  customerId:     z.string().cuid().optional(),
  salespersonId:  z.string().cuid().optional(),
  taxable:        z.boolean().default(false),
  discountAmount: z.number().min(0).default(0),
  taxRate:        z.number().min(0).max(100).default(0),
  notes:          z.string().optional(),
  payments: z.array(z.object({
    method:    z.enum(['CASH', 'CARD', 'MOBILE_MONEY', 'BANK_TRANSFER']),
    amount:    z.number().min(0),
    reference: z.string().optional(),
  })).min(1, 'At least one payment is required'),
})

export type CustomerInput = z.infer<typeof customerSchema>
export type CheckoutInput  = z.infer<typeof checkoutSchema>
