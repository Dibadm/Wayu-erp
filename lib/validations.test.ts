import { describe, it, expect } from 'vitest'
import { loginSchema, productSchema, movementSchema, supplierSchema, purchaseOrderSchema, checkoutSchema } from './validations'

describe('loginSchema', () => {
  it('validates correct email and password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'password123' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'password123' })
    expect(result.success).toBe(false)
  })

  it('rejects password shorter than 6 characters', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '123' })
    expect(result.success).toBe(false)
  })
})

describe('productSchema', () => {
  it('validates a complete product', () => {
    const result = productSchema.safeParse({
      sku: 'SKU-001',
      name: 'Aspirin',
      description: 'Pain reliever',
      category: 'Medicine',
      quantity: 100,
      minStockLevel: 10,
      unit: 'tablets',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty SKU', () => {
    const result = productSchema.safeParse({ sku: '', name: 'Aspirin' })
    expect(result.success).toBe(false)
  })

  it('defaults category to General', () => {
    const result = productSchema.safeParse({ sku: 'SKU-001', name: 'Aspirin', quantity: 10, minStockLevel: 5 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.category).toBe('General')
    }
  })

  it('rejects negative quantity', () => {
    const result = productSchema.safeParse({ sku: 'SKU-001', name: 'Aspirin', quantity: -1, minStockLevel: 5 })
    expect(result.success).toBe(false)
  })
})

describe('movementSchema', () => {
  it('validates an IN movement', () => {
    const result = movementSchema.safeParse({
      productId: 'c000000000000000000000000',
      type: 'IN',
      quantity: 50,
    })
    expect(result.success).toBe(true)
  })

  it('rejects quantity of 0', () => {
    const result = movementSchema.safeParse({
      productId: 'c000000000000000000000000',
      type: 'IN',
      quantity: 0,
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid product ID', () => {
    const result = movementSchema.safeParse({
      productId: 'not-a-cuid',
      type: 'OUT',
      quantity: 1,
    })
    expect(result.success).toBe(false)
  })
})

describe('supplierSchema', () => {
  it('validates a complete supplier', () => {
    const result = supplierSchema.safeParse({
      name: 'PharmaCo',
      contactPerson: 'John Doe',
      email: 'john@pharmacompany.com',
      phone: '+251-XXX-XXXX',
      status: 'ACTIVE',
    })
    expect(result.success).toBe(true)
  })

  it('defaults status to ACTIVE', () => {
    const result = supplierSchema.safeParse({ name: 'PharmaCo' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('ACTIVE')
    }
  })
})

describe('purchaseOrderSchema', () => {
  it('validates a PO with items', () => {
    const result = purchaseOrderSchema.safeParse({
      supplierId: 'c000000000000000000000000',
      items: [
        { productId: 'c000000000000000000000000', quantityOrdered: 100, unitCost: 5.0 },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects PO with no items', () => {
    const result = purchaseOrderSchema.safeParse({
      supplierId: 'c000000000000000000000000',
      items: [],
    })
    expect(result.success).toBe(false)
  })
})

describe('checkoutSchema', () => {
  it('validates a checkout with items and payments', () => {
    const result = checkoutSchema.safeParse({
      items: [{ productId: 'c000000000000000000000000', quantity: 2, unitPrice: 10 }],
      payments: [{ method: 'CASH', amount: 20 }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects checkout with no items', () => {
    const result = checkoutSchema.safeParse({
      items: [],
      payments: [{ method: 'CASH', amount: 20 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects checkout with no payments', () => {
    const result = checkoutSchema.safeParse({
      items: [{ productId: 'c000000000000000000000000', quantity: 2, unitPrice: 10 }],
      payments: [],
    })
    expect(result.success).toBe(false)
  })
})