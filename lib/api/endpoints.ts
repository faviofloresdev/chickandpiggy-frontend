export const strapiEndpoints = {
  global: 'api/global',
  header: 'api/header',
  footer: 'api/footer',
  contact: 'api/contact',
  landing: 'api/landing',
  promoBanner: 'api/promo-banner',
  products: 'api/products',
  productVariants: 'api/product-variants',
  featuredProduct: 'api/featured-product',
  categories: 'api/categories',
  faqs: 'api/faqs',
} as const

export const bffEndpoints = {
  global: '/api/content/global',
  header: '/api/content/header',
  footer: '/api/content/footer',
  contact: '/api/content/contact',
  landing: '/api/content/landing',
  promoBanner: '/api/content/promo-banner',
  featuredProduct: '/api/content/featured-product',
  products: '/api/catalog/products',
  featuredProducts: '/api/catalog/featured-products',
  categories: '/api/catalog/categories',
  faqs: '/api/content/faqs',
} as const
