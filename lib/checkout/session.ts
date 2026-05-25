import { z } from 'zod'

export const checkoutCustomerSchema = z.object({
  name: z.string().trim().min(2, 'Customer name is required.'),
  email: z.string().trim().email('A valid email address is required.'),
  phone: z
    .string()
    .trim()
    .min(10, 'Contact number is required.')
    .max(25, 'Contact number is too long.'),
})

const stateSchema = z
  .string()
  .trim()
  .min(2, 'State is required.')
  .max(3, 'State code is too long.')
  .transform((value) => value.toUpperCase())

const countrySchema = z
  .string()
  .trim()
  .min(2, 'Country is required.')
  .max(2, 'Country code must be 2 characters.')
  .transform((value) => value.toUpperCase())

const checkoutAddressSchema = z.object({
  addressLine1: z.string().trim().min(5, 'Street address is required.'),
  addressLine2: z.string().trim().max(120, 'Address line 2 is too long.').optional(),
  city: z.string().trim().min(2, 'City is required.'),
  state: stateSchema,
  postalCode: z.string().trim().min(3, 'Postal code is required.').max(12),
  country: countrySchema.default('US'),
})

export const checkoutShippingSchema = checkoutAddressSchema.extend({
  selectedShippingOptionId: z.string().trim().optional(),
  googleValidatedAddress: z.boolean().optional().default(false),
})

export const checkoutBillingSchema = checkoutAddressSchema

export const checkoutItemsSchema = z.array(z.unknown()).min(1, 'Checkout requires at least one item.')
export const checkoutDiscountCodeSchema = z
  .string()
  .trim()
  .min(1, 'Discount code is required.')
  .max(64, 'Discount code is too long.')

export const checkoutQuoteRequestSchema = z.object({
  items: checkoutItemsSchema,
  shipping: checkoutShippingSchema.omit({
    selectedShippingOptionId: true,
  }),
  discountCode: checkoutDiscountCodeSchema.optional(),
})

export const checkoutPaymentIntentRequestSchema = z.object({
  items: checkoutItemsSchema,
  customer: checkoutCustomerSchema,
  shipping: checkoutShippingSchema.extend({
    selectedShippingOptionId: z
      .string()
      .trim()
      .min(1, 'Please choose a shipping option before continuing.'),
  }),
  billing: checkoutBillingSchema.optional(),
  discountCode: checkoutDiscountCodeSchema.optional(),
  orderId: z.number().int().positive().optional(),
  paymentIntentId: z.string().trim().min(1).optional(),
})

export type CheckoutCustomerDetails = z.infer<typeof checkoutCustomerSchema>
export type CheckoutShippingDetails = z.infer<typeof checkoutShippingSchema>
export type CheckoutBillingDetails = z.infer<typeof checkoutBillingSchema>
export type CheckoutQuoteRequest = z.infer<typeof checkoutQuoteRequestSchema>
export type CheckoutPaymentIntentRequest = z.infer<typeof checkoutPaymentIntentRequestSchema>
