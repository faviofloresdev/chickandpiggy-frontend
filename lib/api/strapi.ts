import 'server-only'

import type {
  Category,
  ContactInfo,
  FaqItem,
  FooterContent,
  FooterLink,
  FooterLinkGroup,
  FooterSocialLink,
  FeaturedProductsContent,
  GlobalContent,
  HeaderContent,
  HeroContent,
  PromoBannerContent,
  Product,
  ProductCategory,
  ProductOptionGroup,
  ProductOptionValue,
  RichTextNode,
  ProductVariant,
} from '@/lib/api/contracts'
import { env } from '@/lib/config/env'
import { strapiEndpoints } from '@/lib/api/endpoints'
import {
  fallbackCategories,
  fallbackFooter,
  fallbackFaqs,
  fallbackHero,
  fallbackPromoBanner,
  fallbackProducts,
} from '@/lib/data/catalog'

type Primitive = string | number | boolean
type QueryValue = Primitive | Primitive[] | undefined

interface StrapiFetchOptions extends Omit<RequestInit, 'body'> {
  query?: Record<string, QueryValue>
  revalidate?: number
  tags?: string[]
  cache?: RequestCache
}

export interface ApiDataResult<T> {
  data: T
  source: 'strapi' | 'fallback'
  error?: string
}

class StrapiRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message)
    this.name = 'StrapiRequestError'
  }
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Unknown Strapi error'
}

function logFallback(scope: string, error: unknown) {
  console.error(`[strapi:${scope}] falling back to local data`, error)
}

const DEFAULT_REVALIDATE_SECONDS = 60
const CONTENT_REVALIDATE_SECONDS = 300
const STRAPI_URL = env.strapiUrl
const STRAPI_TOKEN = env.strapiToken
const PRODUCT_POPULATE_QUERY = {
  'populate[0]': 'images',
  'populate[1]': 'categories',
  'populate[2]': 'product_options.option_values',
  'populate[3]': 'product_variants.option_values',
  'populate[4]': 'ogImage',
} as const

function appendQueryParams(url: URL, query?: Record<string, QueryValue>) {
  if (!query) {
    return
  }

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) {
      continue
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => url.searchParams.append(key, String(entry)))
      continue
    }

    url.searchParams.set(key, String(value))
  }
}

async function strapiFetch<T>(
  path: string,
  {
    query,
    revalidate = DEFAULT_REVALIDATE_SECONDS,
    tags,
    cache,
    headers,
    ...init
  }: StrapiFetchOptions = {}
): Promise<T> {
  const url = new URL(path, `${STRAPI_URL}/`)
  appendQueryParams(url, query)

  const nextOptions =
    cache === 'no-store'
      ? undefined
      : {
          revalidate,
          tags,
        }

  const response = await fetch(url, {
    ...init,
    cache,
    headers: {
      Accept: 'application/json',
      ...(STRAPI_TOKEN ? { Authorization: `Bearer ${STRAPI_TOKEN}` } : {}),
      ...headers,
    },
    next: nextOptions,
  })

  if (!response.ok) {
    throw new StrapiRequestError(
      `Strapi request failed for ${url.pathname}: ${response.status}`,
      response.status
    )
  }

  return (await response.json()) as T
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[]
  }

  if (
    value &&
    typeof value === 'object' &&
    'data' in value &&
    Array.isArray((value as { data?: unknown[] }).data)
  ) {
    return (value as { data: T[] }).data
  }

  return []
}

function getAttribute(source: Record<string, unknown>, key: string) {
  const direct = source[key]
  const attributes =
    source.attributes && typeof source.attributes === 'object'
      ? (source.attributes as Record<string, unknown>)
      : undefined

  return direct ?? attributes?.[key]
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function asSingleRecord(value: unknown): Record<string, unknown> | undefined {
  const record = asRecord(value)

  if (!record) {
    return undefined
  }

  if ('data' in record && record.data && typeof record.data === 'object' && !Array.isArray(record.data)) {
    return record.data as Record<string, unknown>
  }

  return record
}

function resolveMediaUrl(
  source: Record<string, unknown>,
  fieldNames: string[] = ['heroImage', 'image', 'images']
) {
  const image = fieldNames
    .map((fieldName) => getAttribute(source, fieldName))
    .find((value) => value !== undefined)
  const media =
    image && typeof image === 'object'
      ? (image as Record<string, unknown>)
      : undefined

  if (Array.isArray(image) && image.length > 0) {
    const firstImage = image[0]
    if (firstImage && typeof firstImage === 'object') {
      const relativeUrl = getAttribute(firstImage as Record<string, unknown>, 'url')
      if (typeof relativeUrl === 'string' && relativeUrl) {
        return relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')
          ? relativeUrl
          : new URL(relativeUrl, STRAPI_URL).toString()
      }
    }
  }

  const mediaData =
    media?.data && Array.isArray(media.data)
      ? (media.data as Record<string, unknown>[])
      : undefined

  if (mediaData && mediaData.length > 0) {
    const firstImage = mediaData[0]
    const relativeUrl = getAttribute(firstImage, 'url')

    if (typeof relativeUrl === 'string' && relativeUrl) {
      return relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')
        ? relativeUrl
        : new URL(relativeUrl, STRAPI_URL).toString()
    }
  }

  const nestedMedia =
    media?.data && typeof media.data === 'object'
      ? (media.data as Record<string, unknown>)
      : media

  const relativeUrl =
    nestedMedia ? getAttribute(nestedMedia, 'url') : getAttribute(source, 'imageUrl')

  if (typeof relativeUrl !== 'string' || !relativeUrl) {
    return ''
  }

  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
    return relativeUrl
  }

  return STRAPI_URL ? new URL(relativeUrl, STRAPI_URL).toString() : relativeUrl
}

function extractRichText(source: unknown): string | undefined {
  if (typeof source === 'string') {
    return source
  }

  if (!Array.isArray(source)) {
    return undefined
  }

  const text = source
    .flatMap((node) => {
      if (!node || typeof node !== 'object' || !('children' in node)) {
        return []
      }

      const children = (node as { children?: unknown[] }).children
      if (!Array.isArray(children)) {
        return []
      }

      return children
        .map((child) =>
          child && typeof child === 'object' && 'text' in child
            ? String((child as { text?: unknown }).text ?? '')
            : ''
        )
        .filter(Boolean)
    })
    .join(' ')
    .trim()

  return text || undefined
}

function extractStringList(source: unknown): string[] {
  if (Array.isArray(source)) {
    return source
      .map((entry) => {
        if (typeof entry === 'string') {
          return entry.trim()
        }

        if (typeof entry === 'number') {
          return String(entry)
        }

        if (entry && typeof entry === 'object') {
          const record = entry as Record<string, unknown>
          const candidate =
            typeof record.value === 'string'
              ? record.value
              : typeof record.name === 'string'
                ? record.name
                : typeof record.label === 'string'
                  ? record.label
                  : undefined

          return candidate?.trim() ?? ''
        }

        return ''
      })
      .filter(Boolean)
  }

  if (source && typeof source === 'object') {
    const record = source as Record<string, unknown>

    if (Array.isArray(record.colors)) {
      return extractStringList(record.colors)
    }

    if (Array.isArray(record.sizes)) {
      return extractStringList(record.sizes)
    }

    if (Array.isArray(record.values)) {
      return extractStringList(record.values)
    }
  }

  return []
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function normalizeOptionType(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function formatOptionLabel(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function isLikelySize(value: string) {
  const normalized = value.trim().toLowerCase()
  return /^(xs|s|m|l|xl|xxl|xxxl|\d+([./-]\d+)?|small|medium|large)$/.test(normalized)
}

function extractOptionValueLabel(entry: Record<string, unknown>) {
  const label = getAttribute(entry, 'label')
  const value = getAttribute(entry, 'value')

  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (typeof label === 'string' && label.trim()) {
    return label.trim()
  }

  return undefined
}

function classifyOptionValue(
  optionValue: Record<string, unknown>,
  optionValueIndex: Map<string, string>,
  optionTypeSet: Set<string>
) {
  const rawValue = extractOptionValueLabel(optionValue)
  if (!rawValue) {
    return undefined
  }

  const normalizedValue = rawValue.toLowerCase()
  const indexedType = optionValueIndex.get(normalizedValue)

  if (indexedType === 'color') {
    return { type: 'color' as const, value: normalizedValue, label: rawValue }
  }

  if (indexedType === 'size') {
    return { type: 'size' as const, value: rawValue, label: rawValue }
  }

  if (indexedType) {
    return { type: indexedType, value: rawValue, label: rawValue }
  }

  if (optionTypeSet.size === 1) {
    const onlyType = [...optionTypeSet][0]
    if (onlyType === 'color') {
      return { type: 'color' as const, value: normalizedValue, label: rawValue }
    }

    if (onlyType === 'size') {
      return { type: 'size' as const, value: rawValue, label: rawValue }
    }

    return { type: onlyType, value: rawValue, label: rawValue }
  }

  if (isLikelySize(rawValue)) {
    return { type: 'size' as const, value: rawValue, label: rawValue }
  }

  return undefined
}

function buildProductOptions(entry: Record<string, unknown>): ProductOptionGroup[] {
  const options = asArray<Record<string, unknown>>(
    getAttribute(entry, 'product_options') ?? getAttribute(entry, 'productOptions')
  )

  const groupedOptions = new Map<
    string,
    {
      id: string
      label: string
      values: Map<string, ProductOptionValue>
    }
  >()

  options.forEach((option) => {
    const type = normalizeOptionType(getAttribute(option, 'type'))

    if (!type) {
      return
    }

    const optionLabel =
      typeof getAttribute(option, 'name') === 'string' && String(getAttribute(option, 'name')).trim()
        ? String(getAttribute(option, 'name')).trim()
        : formatOptionLabel(type)

    const existingGroup = groupedOptions.get(type) ?? {
      id: String(getAttribute(option, 'documentId') ?? getAttribute(option, 'id') ?? type),
      label: optionLabel,
      values: new Map<string, ProductOptionValue>(),
    }

    asArray<Record<string, unknown>>(getAttribute(option, 'option_values')).forEach((optionValue) => {
      const label = extractOptionValueLabel(optionValue)

      if (!label) {
        return
      }

      const normalizedValue = type === 'color' ? label.toLowerCase() : label

      if (!existingGroup.values.has(normalizedValue)) {
        existingGroup.values.set(normalizedValue, {
          value: normalizedValue,
          label,
          hexColor:
            typeof getAttribute(optionValue, 'hexColor') === 'string'
              ? String(getAttribute(optionValue, 'hexColor'))
              : undefined,
        })
      }
    })

    groupedOptions.set(type, existingGroup)
  })

  return [...groupedOptions.entries()].map(([type, group]) => ({
    id: group.id,
    type,
    label: group.label,
    values: [...group.values.values()],
  }))
}

function mergeProductOptionValues(
  productOptions: ProductOptionGroup[],
  variants: Record<string, unknown>[],
  optionValueIndex: Map<string, string>,
  optionTypeSet: Set<string>
) {
  const optionGroups = new Map<
    string,
    {
      id: string
      label: string
      values: Map<string, ProductOptionValue>
    }
  >()

  productOptions.forEach((option) => {
    optionGroups.set(option.type, {
      id: option.id,
      label: option.label,
      values: new Map(option.values.map((value) => [value.value, value])),
    })
  })

  variants.forEach((variant) => {
    const optionValues = asArray<Record<string, unknown>>(getAttribute(variant, 'option_values'))

    optionValues.forEach((optionValue) => {
      const classified = classifyOptionValue(optionValue, optionValueIndex, optionTypeSet)

      if (!classified) {
        return
      }

      const normalizedValue = classified.type === 'color' ? classified.value.toLowerCase() : classified.value
      const existingGroup = optionGroups.get(classified.type) ?? {
        id: classified.type,
        label: formatOptionLabel(classified.type),
        values: new Map<string, ProductOptionValue>(),
      }

      if (!existingGroup.values.has(normalizedValue)) {
        existingGroup.values.set(normalizedValue, {
          value: normalizedValue,
          label: classified.label,
          hexColor:
            typeof getAttribute(optionValue, 'hexColor') === 'string'
              ? String(getAttribute(optionValue, 'hexColor'))
              : undefined,
        })
      }

      optionGroups.set(classified.type, existingGroup)
    })
  })

  return [...optionGroups.entries()].map(([type, group]) => ({
    id: group.id,
    type,
    label: group.label,
    values: [...group.values.values()],
  }))
}

function normalizeProductVariantEntry(
  variant: Record<string, unknown>,
  optionValueIndex: Map<string, string>,
  optionTypeSet: Set<string>
): ProductVariant | undefined {
  if (getAttribute(variant, 'active') === false) {
    return undefined
  }

  const optionValues = asArray<Record<string, unknown>>(getAttribute(variant, 'option_values'))
  let color: string | undefined
  let colorLabel: string | undefined
  let colorHex: string | undefined
  let size: string | undefined
  const optionEntries: Record<string, ProductOptionValue> = {}

  optionValues.forEach((optionValue) => {
    const classified = classifyOptionValue(optionValue, optionValueIndex, optionTypeSet)

    if (!classified) {
      return
    }

    if (classified.type === 'color') {
      color = classified.value
      colorLabel = classified.label
      colorHex =
        typeof getAttribute(optionValue, 'hexColor') === 'string'
          ? String(getAttribute(optionValue, 'hexColor'))
          : undefined
    }

    if (classified.type === 'size') {
      size = classified.value
    }

    optionEntries[classified.type] = {
      value: classified.type === 'color' ? classified.value : classified.value,
      label: classified.label,
      hexColor:
        typeof getAttribute(optionValue, 'hexColor') === 'string'
          ? String(getAttribute(optionValue, 'hexColor'))
          : undefined,
    }
  })

  return {
    id: String(getAttribute(variant, 'documentId') ?? getAttribute(variant, 'id') ?? crypto.randomUUID()),
    strapiId:
      getAttribute(variant, 'id') !== undefined ? String(getAttribute(variant, 'id')) : undefined,
    documentId:
      typeof getAttribute(variant, 'documentId') === 'string'
        ? String(getAttribute(variant, 'documentId'))
        : undefined,
    sku:
      typeof getAttribute(variant, 'sku') === 'string'
        ? String(getAttribute(variant, 'sku'))
        : undefined,
    price:
      Number.isFinite(Number(getAttribute(variant, 'priceOverride')))
        ? Number(getAttribute(variant, 'priceOverride'))
        : undefined,
    image: resolveMediaUrl({
      image: getAttribute(variant, 'image'),
    }),
    color,
    colorLabel,
    colorHex,
    size,
    optionValues: Object.keys(optionEntries).length > 0 ? optionEntries : undefined,
    stock:
      Number.isFinite(Number(getAttribute(variant, 'stock')))
        ? Number(getAttribute(variant, 'stock'))
        : undefined,
  }
}

function normalizeProductVariants(entry: Record<string, unknown>) {
  const options = asArray<Record<string, unknown>>(
    getAttribute(entry, 'product_options') ?? getAttribute(entry, 'productOptions')
  )
  const variants = asArray<Record<string, unknown>>(
    getAttribute(entry, 'product_variants') ?? getAttribute(entry, 'productVariants')
  ).filter((variant) => getAttribute(variant, 'active') !== false)

  const optionTypeSet = new Set(
    options.map((option) => normalizeOptionType(getAttribute(option, 'type'))).filter(Boolean)
  )

  const optionValueIndex = options.reduce(
    (acc, option) => {
      const optionType = normalizeOptionType(getAttribute(option, 'type'))
      const optionValues = asArray<Record<string, unknown>>(getAttribute(option, 'option_values'))

      optionValues.forEach((optionValue) => {
        const normalizedValue = extractOptionValueLabel(optionValue)?.toLowerCase()
        if (normalizedValue && optionType) {
          acc.set(normalizedValue, optionType)
        }
      })

      return acc
    },
    new Map<string, string>()
  )

  const productOptions = mergeProductOptionValues(
    buildProductOptions(entry),
    variants,
    optionValueIndex,
    optionTypeSet
  )
  const availableColors: string[] = []
  const availableSizes: string[] = []
  const normalizedVariants: ProductVariant[] = []

  variants.forEach((variant) => {
    const optionValues = asArray<Record<string, unknown>>(getAttribute(variant, 'option_values'))
    const normalizedVariant = normalizeProductVariantEntry(
      variant,
      optionValueIndex,
      optionTypeSet
    )

    if (normalizedVariant) {
      normalizedVariants.push(normalizedVariant)
    }

    optionValues.forEach((optionValue) => {
      const classified = classifyOptionValue(optionValue, optionValueIndex, optionTypeSet)
      if (!classified) {
        return
      }

      if (classified.type === 'color') {
        availableColors.push(classified.value)
      } else {
        availableSizes.push(classified.value)
      }
    })
  })

  return {
    productOptions,
    availableColors: uniqueStrings(availableColors),
    availableSizes: uniqueStrings(availableSizes),
    variants: normalizedVariants,
  }
}

function mergeExternalVariants(product: Product, variants: ProductVariant[] | undefined): Product {
  if (!variants || variants.length === 0) {
    return product
  }

  const availableColors = uniqueStrings(
    variants.map((variant) => variant.color).filter((value): value is string => Boolean(value))
  )
  const availableSizes = uniqueStrings(
    variants.map((variant) => variant.size).filter((value): value is string => Boolean(value))
  )

  return {
    ...product,
    availableColors: availableColors.length > 0 ? availableColors : product.availableColors,
    availableSizes: availableSizes.length > 0 ? availableSizes : product.availableSizes,
    variants,
  }
}

async function loadProductVariantIndex(products: Record<string, unknown>[]) {
  const productContexts = new Map<string, { optionValueIndex: Map<string, string>; optionTypeSet: Set<string> }>()

  products.forEach((product) => {
    const documentId = getAttribute(product, 'documentId')
    if (typeof documentId === 'string' && documentId) {
      const options = asArray<Record<string, unknown>>(
        getAttribute(product, 'product_options') ?? getAttribute(product, 'productOptions')
      )

      const optionTypeSet = new Set(
        options.map((option) => normalizeOptionType(getAttribute(option, 'type'))).filter(Boolean)
      )
      const optionValueIndex = options.reduce(
        (acc, option) => {
          const optionType = normalizeOptionType(getAttribute(option, 'type'))
          const optionValues = asArray<Record<string, unknown>>(getAttribute(option, 'option_values'))

          optionValues.forEach((optionValue) => {
            const normalizedValue = extractOptionValueLabel(optionValue)?.toLowerCase()
            if (normalizedValue && optionType) {
              acc.set(normalizedValue, optionType)
            }
          })

          return acc
        },
        new Map<string, string>()
      )

      productContexts.set(documentId, { optionValueIndex, optionTypeSet })
    }
  })

  if (productContexts.size === 0) {
    return new Map<string, ProductVariant[]>()
  }

  try {
    const payload = await strapiFetch<unknown>(strapiEndpoints.productVariants, {
      query: {
        'populate[0]': 'product',
        'populate[1]': 'option_values',
        'populate[2]': 'image',
        'filters[active][$eq]': true,
      },
      tags: ['catalog', 'product-variants'],
    })

    const variantIndex = new Map<string, ProductVariant[]>()

    asArray<Record<string, unknown>>(payload).forEach((variant) => {
      const product = asSingleRecord(getAttribute(variant, 'product'))
      const productDocumentId = getAttribute(product ?? {}, 'documentId')

      if (typeof productDocumentId !== 'string' || !productContexts.has(productDocumentId)) {
        return
      }

      const context = productContexts.get(productDocumentId)
      if (!context) {
        return
      }

      const normalizedVariant = normalizeProductVariantEntry(
        variant,
        context.optionValueIndex,
        context.optionTypeSet
      )

      if (!normalizedVariant) {
        return
      }

      const variants = variantIndex.get(productDocumentId) ?? []
      variants.push(normalizedVariant)
      variantIndex.set(productDocumentId, variants)
    })

    return variantIndex
  } catch (error) {
    logFallback('product-variants', error)
    return new Map<string, ProductVariant[]>()
  }
}

function normalizeProduct(entry: Record<string, unknown>): Product {
  const productVariants = normalizeProductVariants(entry)
  const categories = asArray<Record<string, unknown>>(getAttribute(entry, 'categories')).map(
    normalizeProductCategory
  )
  const ogImage = asSingleRecord(getAttribute(entry, 'ogImage'))

  return {
    id: String(getAttribute(entry, 'documentId') ?? getAttribute(entry, 'id') ?? crypto.randomUUID()),
    strapiId:
      getAttribute(entry, 'id') !== undefined ? String(getAttribute(entry, 'id')) : undefined,
    documentId:
      typeof getAttribute(entry, 'documentId') === 'string'
        ? String(getAttribute(entry, 'documentId'))
        : undefined,
    slug: String(
      getAttribute(entry, 'slug') ??
        getAttribute(entry, 'documentId') ??
        getAttribute(entry, 'id') ??
        'product'
    ),
    name: String(getAttribute(entry, 'name') ?? getAttribute(entry, 'title') ?? 'Untitled product'),
    price: Number(getAttribute(entry, 'price') ?? getAttribute(entry, 'basePrice') ?? 0),
    image: resolveMediaUrl(entry),
      description:
        extractRichText(getAttribute(entry, 'description')) ??
        (typeof getAttribute(entry, 'description') === 'string'
          ? String(getAttribute(entry, 'description'))
          : undefined),
      metaTitle:
        typeof getAttribute(entry, 'metaTitle') === 'string'
          ? String(getAttribute(entry, 'metaTitle')).trim()
          : undefined,
      metaDescription:
        typeof getAttribute(entry, 'metaDescription') === 'string'
          ? String(getAttribute(entry, 'metaDescription')).trim()
          : undefined,
      ogImage: ogImage ? resolveMediaUrl({ image: [ogImage] }) : undefined,
      categories,
      productOptions: productVariants.productOptions,
      availableColors: productVariants.availableColors,
    availableSizes: productVariants.availableSizes,
    variants: productVariants.variants,
  }
}

function normalizeCategory(entry: Record<string, unknown>): Category {
  const ogImage = asSingleRecord(getAttribute(entry, 'ogImage'))

  return {
      id: String(getAttribute(entry, 'documentId') ?? getAttribute(entry, 'id') ?? crypto.randomUUID()),
      name: String(getAttribute(entry, 'name') ?? 'Unnamed category'),
      count: Number(getAttribute(entry, 'count') ?? 0),
      description:
        extractRichText(getAttribute(entry, 'description')) ??
        (typeof getAttribute(entry, 'description') === 'string'
          ? String(getAttribute(entry, 'description')).trim()
          : undefined),
      slug:
        typeof getAttribute(entry, 'slug') === 'string'
          ? String(getAttribute(entry, 'slug'))
          : undefined,
      metaTitle:
        typeof getAttribute(entry, 'metaTitle') === 'string'
          ? String(getAttribute(entry, 'metaTitle')).trim()
          : undefined,
      metaDescription:
        typeof getAttribute(entry, 'metaDescription') === 'string'
          ? String(getAttribute(entry, 'metaDescription')).trim()
          : undefined,
      ogImage: ogImage ? resolveMediaUrl({ image: [ogImage] }) : undefined,
    }
}

function normalizeProductCategory(entry: Record<string, unknown>): ProductCategory {
  return {
    id: String(getAttribute(entry, 'documentId') ?? getAttribute(entry, 'id') ?? crypto.randomUUID()),
    name: String(getAttribute(entry, 'name') ?? 'Unnamed category'),
    slug:
      typeof getAttribute(entry, 'slug') === 'string'
        ? String(getAttribute(entry, 'slug'))
        : undefined,
  }
}

function normalizeFaq(entry: Record<string, unknown>): FaqItem {
  return {
    id: String(getAttribute(entry, 'documentId') ?? getAttribute(entry, 'id') ?? crypto.randomUUID()),
    question: String(
      getAttribute(entry, 'question') ??
        getAttribute(entry, 'faqQuestion') ??
        'Untitled question'
    ),
    answer: String(
      extractRichText(getAttribute(entry, 'answer') ?? getAttribute(entry, 'faqResponse')) ?? ''
    ),
  }
}

function normalizeHero(entry: Record<string, unknown>): HeroContent {
  const ogImage = asSingleRecord(getAttribute(entry, 'ogImage'))

  return {
    id: String(
      getAttribute(entry, 'documentId') ?? getAttribute(entry, 'id') ?? 'landing-hero'
    ),
    title: String(getAttribute(entry, 'heroTitle') ?? ''),
    highlight: String(getAttribute(entry, 'heroTitleHighlight') ?? ''),
    accent: String(getAttribute(entry, 'heroTitleAccent') ?? ''),
    subtitle: String(getAttribute(entry, 'heroSubtitle') ?? ''),
    ctaLabel: String(getAttribute(entry, 'heroButtonText') ?? ''),
    ctaHref: String(getAttribute(entry, 'heroButtonLink') ?? ''),
    shippingNote: String(getAttribute(entry, 'heroShippingNote') ?? ''),
    image: resolveMediaUrl(entry),
    mobileImage: resolveMediaUrl(entry, ['HeroMobileImage', 'heroMobileImage']),
    imageAlt: String(getAttribute(entry, 'heroImageAlt') ?? ''),
    metaTitle:
      typeof getAttribute(entry, 'metaTitle') === 'string'
        ? String(getAttribute(entry, 'metaTitle')).trim()
        : undefined,
    metaDescription:
      typeof getAttribute(entry, 'metaDescription') === 'string'
        ? String(getAttribute(entry, 'metaDescription')).trim()
        : undefined,
    ogImage: ogImage ? resolveMediaUrl({ image: [ogImage] }) : undefined,
  }
}

function normalizeHeader(entry: Record<string, unknown>): HeaderContent {
  const headerLogo = asRecord(getAttribute(entry, 'HeaderLogo'))

  return {
    id: String(getAttribute(entry, 'documentId') ?? getAttribute(entry, 'id') ?? 'header'),
    logoUrl: headerLogo ? resolveMediaUrl({ image: [headerLogo] }) : undefined,
    logoAlt:
      typeof getAttribute(headerLogo ?? {}, 'alternativeText') === 'string'
        ? String(getAttribute(headerLogo ?? {}, 'alternativeText'))
        : undefined,
  }
}

function normalizeGlobal(entry: Record<string, unknown>): GlobalContent {
  const favicon = asSingleRecord(getAttribute(entry, 'favicon'))
  const defaultSeo = asSingleRecord(getAttribute(entry, 'defaultSeo'))
  const defaultShareImage = asSingleRecord(getAttribute(defaultSeo ?? {}, 'shareImage'))

  return {
    id: String(getAttribute(entry, 'documentId') ?? getAttribute(entry, 'id') ?? 'global'),
    siteName:
      typeof getAttribute(entry, 'siteName') === 'string'
        ? String(getAttribute(entry, 'siteName')).trim()
        : undefined,
    siteDescription:
      typeof getAttribute(entry, 'siteDescription') === 'string'
        ? String(getAttribute(entry, 'siteDescription')).trim()
        : undefined,
    faviconUrl: favicon ? resolveMediaUrl({ image: [favicon] }) : undefined,
    faviconAlt:
      typeof getAttribute(favicon ?? {}, 'alternativeText') === 'string'
        ? String(getAttribute(favicon ?? {}, 'alternativeText')).trim()
        : undefined,
    siteUrl:
      typeof getAttribute(entry, 'siteUrl') === 'string'
        ? String(getAttribute(entry, 'siteUrl')).trim()
        : undefined,
    organizationName:
      typeof getAttribute(entry, 'organizationName') === 'string'
        ? String(getAttribute(entry, 'organizationName')).trim()
        : undefined,
    defaultSeo: defaultSeo
      ? {
          metaTitle:
            typeof getAttribute(defaultSeo, 'metaTitle') === 'string'
              ? String(getAttribute(defaultSeo, 'metaTitle')).trim()
              : undefined,
          metaDescription:
            typeof getAttribute(defaultSeo, 'metaDescription') === 'string'
              ? String(getAttribute(defaultSeo, 'metaDescription')).trim()
              : undefined,
          shareImage: defaultShareImage
            ? resolveMediaUrl({ image: [defaultShareImage] })
            : undefined,
        }
      : undefined,
  }
}

function resolveDefaultFooterHref(label: string) {
  const normalizedLabel = label.trim().toLowerCase()

  if (normalizedLabel === 'privacy' || normalizedLabel === 'privacy policy') {
    return '/privacy'
  }

  if (
    normalizedLabel === 'terms and conditions' ||
    normalizedLabel === 'terms' ||
    normalizedLabel === 'terms & conditions'
  ) {
    return '/terms-and-conditions'
  }

  return undefined
}

function normalizeFooterLink(entry: Record<string, unknown>, fallbackId: string): FooterLink | undefined {
  const labelCandidate =
    getAttribute(entry, 'label') ??
    getAttribute(entry, 'text') ??
    getAttribute(entry, 'title') ??
    getAttribute(entry, 'name')
  const hrefCandidate =
    getAttribute(entry, 'href') ??
    getAttribute(entry, 'url') ??
    getAttribute(entry, 'link') ??
    getAttribute(entry, 'path')

  if (typeof labelCandidate !== 'string' || !labelCandidate.trim()) {
    return undefined
  }

  const label = labelCandidate.trim()
  const rawHref = typeof hrefCandidate === 'string' ? hrefCandidate.trim() : ''
  const href = rawHref && rawHref !== '#' ? rawHref : resolveDefaultFooterHref(label)

  if (!href) {
    return undefined
  }

  return {
    id: String(getAttribute(entry, 'documentId') ?? getAttribute(entry, 'id') ?? fallbackId),
    label,
    href,
  }
}

function normalizeFooterSocialLink(
  entry: Record<string, unknown>,
  fallbackId: string
): FooterSocialLink | undefined {
  const platformCandidate =
    getAttribute(entry, 'platform') ??
    getAttribute(entry, 'label') ??
    getAttribute(entry, 'name') ??
    getAttribute(entry, 'title')
  const hrefCandidate =
    getAttribute(entry, 'href') ??
    getAttribute(entry, 'url') ??
    getAttribute(entry, 'link')

  if (typeof platformCandidate !== 'string' || !platformCandidate.trim()) {
    return undefined
  }

  if (typeof hrefCandidate !== 'string' || !hrefCandidate.trim()) {
    return undefined
  }

  return {
    id: String(getAttribute(entry, 'documentId') ?? getAttribute(entry, 'id') ?? fallbackId),
    platform: platformCandidate.trim(),
    href: hrefCandidate.trim(),
  }
}

function normalizeFooterLinkGroup(
  entry: Record<string, unknown>,
  index: number
): FooterLinkGroup | undefined {
  const titleCandidate =
    getAttribute(entry, 'title') ??
    getAttribute(entry, 'label') ??
    getAttribute(entry, 'name')

  if (typeof titleCandidate !== 'string' || !titleCandidate.trim()) {
    return undefined
  }

  const rawLinks =
    getAttribute(entry, 'links') ??
    getAttribute(entry, 'items') ??
    getAttribute(entry, 'navigation_links') ??
    getAttribute(entry, 'navigationLinks')

  const links = asArray<Record<string, unknown>>(rawLinks)
    .map((link, linkIndex) => normalizeFooterLink(link, `footer-link-${index}-${linkIndex}`))
    .filter((link): link is FooterLink => Boolean(link))

  if (links.length === 0) {
    return undefined
  }

  return {
    id: String(getAttribute(entry, 'documentId') ?? getAttribute(entry, 'id') ?? `footer-group-${index}`),
    title: titleCandidate.trim(),
    links,
  }
}

function normalizeRichTextNodes(value: unknown): RichTextNode[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((node): node is RichTextNode => Boolean(node && typeof node === 'object'))
}

function normalizeFooter(entry: Record<string, unknown>): FooterContent {
  const linkGroupsSource =
    getAttribute(entry, 'linkGroups') ??
    getAttribute(entry, 'link_groups') ??
    getAttribute(entry, 'footerColumns') ??
    getAttribute(entry, 'footer_columns') ??
    getAttribute(entry, 'sections')

  const socialLinksSource =
    getAttribute(entry, 'socialLinks') ??
    getAttribute(entry, 'social_links') ??
    getAttribute(entry, 'socials') ??
    getAttribute(entry, 'redesSociales')

  const bottomLinksSource =
    getAttribute(entry, 'bottomLinks') ??
    getAttribute(entry, 'bottom_links') ??
    getAttribute(entry, 'legalLinks') ??
    getAttribute(entry, 'legal_links')

  const linkGroups = asArray<Record<string, unknown>>(linkGroupsSource)
    .map((group, index) => normalizeFooterLinkGroup(group, index))
    .filter((group): group is FooterLinkGroup => Boolean(group))

  const socialLinks = asArray<Record<string, unknown>>(socialLinksSource)
    .map((social, index) => normalizeFooterSocialLink(social, `footer-social-${index}`))
    .filter((social): social is FooterSocialLink => Boolean(social))

  const bottomLinks = asArray<Record<string, unknown>>(bottomLinksSource)
    .map((link, index) => normalizeFooterLink(link, `footer-bottom-link-${index}`))
    .filter((link): link is FooterLink => Boolean(link))

  return {
    id: String(getAttribute(entry, 'documentId') ?? getAttribute(entry, 'id') ?? 'footer'),
    brandName: String(
      getAttribute(entry, 'brandName') ??
        getAttribute(entry, 'brand_name') ??
        getAttribute(entry, 'title') ??
        fallbackFooter.brandName
    ),
    description: String(
      getAttribute(entry, 'description') ??
        getAttribute(entry, 'subtitle') ??
        getAttribute(entry, 'tagline') ??
        fallbackFooter.description
    ),
    email:
      typeof getAttribute(entry, 'email') === 'string'
        ? String(getAttribute(entry, 'email'))
        : fallbackFooter.email,
    phone:
      typeof getAttribute(entry, 'phone') === 'string'
        ? String(getAttribute(entry, 'phone'))
        : fallbackFooter.phone,
    socialLinks: socialLinks.length > 0 ? socialLinks : fallbackFooter.socialLinks,
    linkGroups: linkGroups.length > 0 ? linkGroups : fallbackFooter.linkGroups,
    copyrightText: String(
      getAttribute(entry, 'copyrightText') ??
        getAttribute(entry, 'copyright') ??
        fallbackFooter.copyrightText
    ),
    bottomLinks: bottomLinks.length > 0 ? bottomLinks : fallbackFooter.bottomLinks,
    privacy: normalizeRichTextNodes(getAttribute(entry, 'privacy')),
    termConditions: normalizeRichTextNodes(
      getAttribute(entry, 'termConditions') ?? getAttribute(entry, 'termsConditions')
    ),
  }
}

function normalizeContactInfo(entry: Record<string, unknown>): ContactInfo {
  const contactEmail = getAttribute(entry, 'contactEmail')
  const contactPhone = getAttribute(entry, 'contactPhone')
  const contactWhatsapp = getAttribute(entry, 'contactWhatsapp')

  return {
    contactEmail: typeof contactEmail === 'string' && contactEmail.trim() ? contactEmail.trim() : undefined,
    contactPhone: typeof contactPhone === 'string' && contactPhone.trim() ? contactPhone.trim() : undefined,
    contactWhatsapp:
      typeof contactWhatsapp === 'string' && contactWhatsapp.trim()
        ? contactWhatsapp.trim()
        : undefined,
  }
}

function normalizePromoBanner(entry: Record<string, unknown>): PromoBannerContent {
  return {
    id: String(
      getAttribute(entry, 'documentId') ?? getAttribute(entry, 'id') ?? 'promo-banner'
    ),
    promoActive: Boolean(getAttribute(entry, 'promoActive') ?? false),
    promoTitle: String(getAttribute(entry, 'promoTitle') ?? ''),
  }
}

function normalizeFeaturedProductsContent(
  entry: Record<string, unknown>
): FeaturedProductsContent {
  const rawLimit = getAttribute(entry, 'featuredProductLimit')
  const parsedLimit =
    typeof rawLimit === 'number' ? rawLimit : typeof rawLimit === 'string' ? Number(rawLimit) : NaN

  return {
    id: String(
      getAttribute(entry, 'documentId') ?? getAttribute(entry, 'id') ?? 'featured-products'
    ),
    featuredProductTitle: String(getAttribute(entry, 'featuredProductTitle') ?? ''),
    featuredProductTopButtonLabel: String(
      getAttribute(entry, 'featuredProductTopButtonLabel') ?? ''
    ),
    featuredProductTopButtonHref: String(
      getAttribute(entry, 'featuredProductTopButtonHref') ?? ''
    ),
    featuredProductBottomButtonLabel: String(
      getAttribute(entry, 'featuredProductBottomButtonLabel') ?? ''
    ),
    featuredProductBottomButtonHref: String(
      getAttribute(entry, 'featuredProductBottomButtonHref') ?? ''
    ),
    featuredProductLimit:
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined,
  }
}

function extractFeaturedProductLimit(payload: unknown): number | undefined {
  const directRecord = asRecord(payload)
  const dataRecord = asRecord(directRecord?.data)
  const source = dataRecord ?? directRecord

  if (!source) {
    return undefined
  }

  const rawLimit = getAttribute(source, 'featuredProductLimit')
  const parsedLimit =
    typeof rawLimit === 'number' ? rawLimit : typeof rawLimit === 'string' ? Number(rawLimit) : NaN

  return Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined
}

function extractSingleTypeData(payload: unknown) {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as { data?: unknown }).data

    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return data as Record<string, unknown>
    }
  }

  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload as Record<string, unknown>
  }

  return undefined
}

export const strapiCatalogApi = {
  async listProducts({ limit }: { limit?: number } = {}): Promise<ApiDataResult<Product[]>> {
    try {
      const payload = await strapiFetch<unknown>(strapiEndpoints.products, {
        query: {
          ...PRODUCT_POPULATE_QUERY,
          sort: 'createdAt:desc',
          'pagination[limit]': limit,
        },
        tags: ['catalog', 'products'],
      })

      const productEntries = asArray<Record<string, unknown>>(payload)
      const productVariantIndex = await loadProductVariantIndex(productEntries)
      const products = productEntries
        .map((entry) =>
          mergeExternalVariants(
            normalizeProduct(entry),
            productVariantIndex.get(
              String(getAttribute(entry, 'documentId') ?? getAttribute(entry, 'id') ?? '')
            )
          )
        )
        .filter((product) => product.image)

      return {
        data: limit ? products.slice(0, limit) : products,
        source: 'strapi',
      }
    } catch (error) {
      logFallback('products', error)
      return {
        data: limit ? fallbackProducts.slice(0, limit) : fallbackProducts,
        source: 'fallback',
        error: toErrorMessage(error),
      }
    }
  },

  async listFeaturedProducts({
    limit,
  }: {
    limit?: number
  } = {}): Promise<ApiDataResult<Product[]>> {
    try {
      const resolvedLimit =
        typeof limit === 'number' && Number.isFinite(limit) && limit > 0
          ? limit
          : extractFeaturedProductLimit(
              await strapiFetch<unknown>(strapiEndpoints.featuredProduct, {
                tags: ['catalog', 'featured-products-config'],
              })
            )

      const payload = await strapiFetch<unknown>(strapiEndpoints.products, {
        query: {
          ...PRODUCT_POPULATE_QUERY,
          sort: 'createdAt:desc',
          'filters[exclusive][$eq]': true,
          'pagination[limit]': resolvedLimit,
        },
        tags: ['catalog', 'products', 'featured-products'],
      })

      const productEntries = asArray<Record<string, unknown>>(payload)
      const productVariantIndex = await loadProductVariantIndex(productEntries)
      const products = productEntries
        .map((entry) =>
          mergeExternalVariants(
            normalizeProduct(entry),
            productVariantIndex.get(
              String(getAttribute(entry, 'documentId') ?? getAttribute(entry, 'id') ?? '')
            )
          )
        )
        .filter((product) => product.image)

      return {
        data: resolvedLimit ? products.slice(0, resolvedLimit) : products,
        source: 'strapi',
      }
    } catch (error) {
      logFallback('featured-products', error)
      return {
        data: [],
        source: 'fallback',
        error: toErrorMessage(error),
      }
    }
  },

  async listCategories(): Promise<ApiDataResult<Category[]>> {
    try {
      const payload = await strapiFetch<unknown>(strapiEndpoints.categories, {
        query: {
          sort: 'name:asc',
          populate: '*',
        },
        tags: ['catalog', 'categories'],
      })

      const categories = asArray<Record<string, unknown>>(payload).map(normalizeCategory)
      return {
        data: categories.length > 0 ? categories : fallbackCategories,
        source: 'strapi',
      }
    } catch (error) {
      logFallback('categories', error)
      return {
        data: fallbackCategories,
        source: 'fallback',
        error: toErrorMessage(error),
      }
    }
  },
}

export const strapiContentApi = {
  async getGlobal(): Promise<ApiDataResult<GlobalContent>> {
    try {
      const payload = await strapiFetch<unknown>(strapiEndpoints.global, {
        query: {
          populate: '*',
        },
        tags: ['content', 'global'],
        revalidate: CONTENT_REVALIDATE_SECONDS,
      })

      const data = extractSingleTypeData(payload)

      if (data) {
        return {
          data: normalizeGlobal(data),
          source: 'strapi',
        }
      }

      return {
        data: {
          id: 'global',
        },
        source: 'fallback',
        error: 'Global payload was empty or malformed',
      }
    } catch (error) {
      logFallback('global', error)
      return {
        data: {
          id: 'global',
        },
        source: 'fallback',
        error: toErrorMessage(error),
      }
    }
  },

  async getHeader(): Promise<ApiDataResult<HeaderContent>> {
    try {
      const payload = await strapiFetch<unknown>(strapiEndpoints.header, {
        query: {
          populate: '*',
        },
        tags: ['content', 'header'],
        revalidate: CONTENT_REVALIDATE_SECONDS,
      })

      const data = extractSingleTypeData(payload)

      if (data) {
        return {
          data: normalizeHeader(data),
          source: 'strapi',
        }
      }

      return {
        data: {
          id: 'header',
        },
        source: 'fallback',
        error: 'Header payload was empty or malformed',
      }
    } catch (error) {
      logFallback('header', error)
      return {
        data: {
          id: 'header',
        },
        source: 'fallback',
        error: toErrorMessage(error),
      }
    }
  },

  async getFooter(): Promise<ApiDataResult<FooterContent>> {
    try {
      const payload = await strapiFetch<unknown>(strapiEndpoints.footer, {
        query: {
          populate: '*',
        },
        tags: ['content', 'footer'],
        revalidate: CONTENT_REVALIDATE_SECONDS,
      })

      const data = extractSingleTypeData(payload)

      if (data) {
        return {
          data: normalizeFooter(data),
          source: 'strapi',
        }
      }

      return {
        data: fallbackFooter,
        source: 'fallback',
        error: 'Footer payload was empty or malformed',
      }
    } catch (error) {
      logFallback('footer', error)
      return {
        data: fallbackFooter,
        source: 'fallback',
        error: toErrorMessage(error),
      }
    }
  },

  async getContactInfo(): Promise<ApiDataResult<ContactInfo>> {
    try {
      const payload = await strapiFetch<unknown>(strapiEndpoints.contact, {
        tags: ['content', 'contact'],
        revalidate: CONTENT_REVALIDATE_SECONDS,
      })

      const data = extractSingleTypeData(payload)

      if (data) {
        return {
          data: normalizeContactInfo(data),
          source: 'strapi',
        }
      }

      return {
        data: {},
        source: 'fallback',
        error: 'Contact payload was empty or malformed',
      }
    } catch (error) {
      logFallback('contact', error)
      return {
        data: {},
        source: 'fallback',
        error: toErrorMessage(error),
      }
    }
  },

  async getLandingHero(): Promise<ApiDataResult<HeroContent>> {
    try {
      const payload = await strapiFetch<unknown>(strapiEndpoints.landing, {
        query: {
          populate: '*',
        },
        tags: ['content', 'landing'],
        revalidate: CONTENT_REVALIDATE_SECONDS,
      })

      if (payload && typeof payload === 'object' && 'data' in payload) {
        const data = (payload as { data?: unknown }).data

        if (data && typeof data === 'object' && !Array.isArray(data)) {
          return {
            data: normalizeHero(data as Record<string, unknown>),
            source: 'strapi',
          }
        }
      }

      if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        return {
          data: normalizeHero(payload as Record<string, unknown>),
          source: 'strapi',
        }
      }

      return {
        data: fallbackHero,
        source: 'fallback',
        error: 'Landing payload was empty or malformed',
      }
    } catch (error) {
      logFallback('landing', error)
      return {
        data: fallbackHero,
        source: 'fallback',
        error: toErrorMessage(error),
      }
    }
  },

  async getPromoBanner(): Promise<ApiDataResult<PromoBannerContent>> {
    try {
      const payload = await strapiFetch<unknown>(strapiEndpoints.promoBanner, {
        query: {
          populate: '*',
        },
        tags: ['content', 'promo-banner'],
      })

      if (payload && typeof payload === 'object' && 'data' in payload) {
        const data = (payload as { data?: unknown }).data

        if (data && typeof data === 'object' && !Array.isArray(data)) {
          return {
            data: normalizePromoBanner(data as Record<string, unknown>),
            source: 'strapi',
          }
        }
      }

      if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        return {
          data: normalizePromoBanner(payload as Record<string, unknown>),
          source: 'strapi',
        }
      }

      return {
        data: fallbackPromoBanner,
        source: 'fallback',
        error: 'Promo banner payload was empty or malformed',
      }
    } catch (error) {
      logFallback('promo-banner', error)
      return {
        data: fallbackPromoBanner,
        source: 'fallback',
        error: toErrorMessage(error),
      }
    }
  },

  async getFeaturedProductsContent(): Promise<
    ApiDataResult<FeaturedProductsContent>
  > {
    try {
      const payload = await strapiFetch<unknown>(strapiEndpoints.featuredProduct, {
        tags: ['content', 'featured-product'],
        revalidate: CONTENT_REVALIDATE_SECONDS,
      })

      const data = extractSingleTypeData(payload)

      if (data) {
        return {
          data: normalizeFeaturedProductsContent(data),
          source: 'strapi',
        }
      }

      return {
        data: {
          id: 'featured-products',
          featuredProductTitle: '',
          featuredProductTopButtonLabel: '',
          featuredProductTopButtonHref: '',
          featuredProductBottomButtonLabel: '',
          featuredProductBottomButtonHref: '',
          featuredProductLimit: undefined,
        },
        source: 'fallback',
        error: 'Featured products payload was empty or malformed',
      }
    } catch (error) {
      logFallback('featured-product', error)
      return {
        data: {
          id: 'featured-products',
          featuredProductTitle: '',
          featuredProductTopButtonLabel: '',
          featuredProductTopButtonHref: '',
          featuredProductBottomButtonLabel: '',
          featuredProductBottomButtonHref: '',
          featuredProductLimit: undefined,
        },
        source: 'fallback',
        error: toErrorMessage(error),
      }
    }
  },

  async listFaqs(): Promise<ApiDataResult<FaqItem[]>> {
    try {
      const payload = await strapiFetch<unknown>(strapiEndpoints.faqs, {
        query: {
          sort: 'createdAt:asc',
        },
        tags: ['content', 'faqs'],
      })

      const directFaqs = asArray<Record<string, unknown>>(payload).map(normalizeFaq)
      const singleTypeData = extractSingleTypeData(payload)
      const nestedFaqsSource =
        getAttribute(singleTypeData ?? {}, 'faqs') ??
        getAttribute(singleTypeData ?? {}, 'questions') ??
        getAttribute(singleTypeData ?? {}, 'items')
      const nestedFaqs = asArray<Record<string, unknown>>(nestedFaqsSource).map(normalizeFaq)
      const faqs = directFaqs.length > 0 ? directFaqs : nestedFaqs

      return {
        data: faqs.length > 0 ? faqs : fallbackFaqs,
        source: 'strapi',
      }
    } catch (error) {
      logFallback('faqs', error)
      return {
        data: fallbackFaqs,
        source: 'fallback',
        error: toErrorMessage(error),
      }
    }
  },
}
