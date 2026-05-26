export interface ProductOptionValue {
  value: string
  label: string
  hexColor?: string
}

export interface ProductOptionGroup {
  id: string
  type: string
  label: string
  values: ProductOptionValue[]
}

export interface ProductVariant {
  id: string
  strapiId?: string
  documentId?: string
  sku?: string
  price?: number
  image?: string
  color?: string
  colorLabel?: string
  colorHex?: string
  size?: string
  optionValues?: Record<string, ProductOptionValue>
  stock?: number
}

export interface ProductCategory {
  id: string
  name: string
  slug?: string
}

export interface Product {
  id: string
  strapiId?: string
  documentId?: string
  slug: string
  name: string
  price: number
  image: string
  description?: string
  metaTitle?: string
  metaDescription?: string
  ogImage?: string
  categories?: ProductCategory[]
  productOptions?: ProductOptionGroup[]
  availableColors?: string[]
  availableSizes?: string[]
  variants?: ProductVariant[]
  selectedVariantId?: string
  selectedColor?: string
  selectedSize?: string
  selectedOptions?: Record<string, string>
}

export interface Category {
  id: string
  name: string
  count: number
  slug?: string
  description?: string
  metaTitle?: string
  metaDescription?: string
  ogImage?: string
}

export interface FaqItem {
  id: string
  question: string
  answer: string
}

export interface HeroContent {
  id: string
  title: string
  highlight: string
  accent: string
  subtitle: string
  ctaLabel: string
  ctaHref: string
  shippingNote: string
  image: string
  mobileImage?: string
  imageAlt: string
  metaTitle?: string
  metaDescription?: string
  ogImage?: string
}

export interface PromoBannerContent {
  id: string
  promoActive: boolean
  promoTitle: string
}

export interface FeaturedProductsContent {
  id: string
  featuredProductTitle: string
  featuredProductTopButtonLabel: string
  featuredProductTopButtonHref: string
  featuredProductBottomButtonLabel: string
  featuredProductBottomButtonHref: string
  featuredProductLimit?: number
}

export interface HeaderContent {
  id: string
  logoUrl?: string
  logoAlt?: string
}

export interface GlobalContent {
  id: string
  siteName?: string
  siteDescription?: string
  faviconUrl?: string
  faviconAlt?: string
  siteUrl?: string
  organizationName?: string
  defaultSeo?: {
    metaTitle?: string
    metaDescription?: string
    shareImage?: string
  }
}

export interface FooterLink {
  id: string
  label: string
  href: string
}

export interface FooterLinkGroup {
  id: string
  title: string
  links: FooterLink[]
}

export interface FooterSocialLink {
  id: string
  platform: string
  href: string
  icon?: string
}

export interface ContactInfo {
  contactEmail?: string
  contactPhone?: string
  contactWhatsapp?: string
}

export interface RichTextTextNode {
  type: 'text'
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
}

export interface RichTextBlockNode {
  type: 'heading' | 'paragraph' | 'list' | 'list-item'
  level?: number
  format?: 'ordered' | 'unordered'
  children?: RichTextNode[]
}

export type RichTextNode = RichTextTextNode | RichTextBlockNode

export interface FooterContent {
  id: string
  brandName: string
  description: string
  email?: string
  phone?: string
  socialLinks: FooterSocialLink[]
  linkGroups: FooterLinkGroup[]
  copyrightText: string
  bottomLinks: FooterLink[]
  privacy: RichTextNode[]
  termConditions: RichTextNode[]
}
