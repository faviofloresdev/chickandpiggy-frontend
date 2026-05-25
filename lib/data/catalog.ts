import type {
  Category,
  FaqItem,
  FooterContent,
  FeaturedProductsContent,
  HeroContent,
  PromoBannerContent,
  Product,
} from '@/lib/api/contracts'

export const fallbackProducts: Product[] = [
  {
    id: '1',
    slug: 'oatmeal-soap',
    name: 'Oatmeal Soap',
    price: 14,
    image:
      'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
    description: 'Handcrafted soap made with natural ingredients for skin care.',
  },
  {
    id: '2',
    slug: 'lavender-soap',
    name: 'Lavender Soap',
    price: 16,
    image:
      'https://images.unsplash.com/photo-1608248593859-6bb117d9ed72?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
    description: 'Handcrafted soap made with natural ingredients for skin care.',
  },
  {
    id: '3',
    slug: 'honey-milk-soap',
    name: 'Honey & Milk Soap',
    price: 13,
    image:
      'https://images.unsplash.com/photo-1584949514123-474cb0c6114b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
    description: 'Handcrafted soap made with natural ingredients for skin care.',
  },
  {
    id: '4',
    slug: 'aloe-vera-bar',
    name: 'Aloe Vera Bar',
    price: 12,
    image:
      'https://images.unsplash.com/photo-1547793548-7a0e7dfdb24f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
    description: 'Handcrafted soap made with natural ingredients for skin care.',
  },
  {
    id: '5',
    slug: 'teddy-bear-soap',
    name: 'Teddy Bear Soap',
    price: 15,
    image:
      'https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/917d6f93-fb36-439a-8c48-884b67b35381_1600w.jpg',
    description: 'Handcrafted soap made with natural ingredients for skin care.',
  },
  {
    id: '6',
    slug: 'bath-flowers',
    name: 'Bath Flowers',
    price: 18,
    image:
      'https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/4734259a-bad7-422f-981e-ce01e79184f2_1600w.jpg',
    description: 'Handcrafted soap made with natural ingredients for skin care.',
  },
]

export const fallbackCategories: Category[] = [
  { id: 'all', name: 'All', count: 24, slug: 'all' },
  { id: 'sensitive-skin', name: 'Sensitive Skin', count: 8, slug: 'sensitive-skin' },
  { id: 'relaxing', name: 'Relaxing', count: 6, slug: 'relaxing' },
  { id: 'gift-sets', name: 'Gift Sets', count: 4, slug: 'gift-sets' },
  { id: 'accessories', name: 'Accessories', count: 6, slug: 'accessories' },
]

export const fallbackFaqs: FaqItem[] = [
  {
    id: 'what-are-your-soaps-made-of',
    question: 'What are your soaps made of?',
    answer:
      'Our soaps are made from vegetable glycerin, natural essential oils, and skin-safe colorants for little ones. We do not use parabens or sulfates.',
  },
  {
    id: 'are-they-safe-for-sensitive-skin',
    question: 'Are they safe for sensitive skin?',
    answer:
      'Yes, all our products are specifically formulated to care for delicate skin. However, we recommend doing a small patch test on the forearm if you have known allergies.',
  },
  {
    id: 'how-long-does-shipping-take',
    question: 'How long does shipping take?',
    answer:
      'We ship nationwide. Orders are processed within 1-2 business days and transit time is usually 3 to 5 business days, depending on your location.',
  },
  {
    id: 'do-you-offer-wholesale-or-event-orders',
    question: 'Do you offer wholesale or event orders?',
    answer:
      'Absolutely! We prepare special orders for baby showers, birthdays, and corporate events. Contact us at least 3 weeks in advance to coordinate the details.',
  },
  {
    id: 'how-should-i-store-my-soap',
    question: 'How should I store my soap?',
    answer:
      'To extend the life of your soap, we recommend using a soap dish with good drainage so it does not sit in water. Keep it in a cool, dry place before use.',
  },
]

export const fallbackHero: HeroContent = {
  id: 'landing-hero',
  title: 'Soaps made',
  highlight: 'care for skin',
  accent: 'to',
  subtitle: 'Made to care for our little ones',
  ctaLabel: 'Get my first soap',
  ctaHref: '/shop',
  shippingNote: 'Nationwide shipping',
  image:
    'https://images.unsplash.com/photo-1600857062241-98e5dba7f214?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  mobileImage:
    'https://images.unsplash.com/photo-1600857062241-98e5dba7f214?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  imageAlt: 'Soaps and bath accessories',
}

export const fallbackPromoBanner: PromoBannerContent = {
  id: 'promo-banner',
  promoActive: true,
  promoTitle: 'Get 20% off your first purchase',
}

export const fallbackFeaturedProductsContent: FeaturedProductsContent = {
  id: 'featured-products',
  featuredProductTitle: 'Our exclusive products',
  featuredProductTopButtonLabel: 'Get my first soap',
  featuredProductTopButtonHref: '/shop',
  featuredProductBottomButtonLabel: 'View all our products',
  featuredProductBottomButtonHref: '/shop',
  featuredProductLimit: undefined,
}

export const fallbackFooter: FooterContent = {
  id: 'footer',
  brandName: 'Chick & Piggy',
  description: 'Handcrafted soaps made with love to care for the skin of your little ones.',
  email: 'hello@chickandpiggy.com',
  phone: '+1 555 123 4567',
  socialLinks: [
    { id: 'instagram', platform: 'Instagram', href: '#' },
    { id: 'linkedin', platform: 'LinkedIn', href: '#' },
    { id: 'twitter', platform: 'Twitter', href: '#' },
  ],
  linkGroups: [
    {
      id: 'products',
      title: 'Products',
      links: [{ id: 'shop', label: 'Shop', href: '/shop' }],
    },
    {
      id: 'information',
      title: 'Information',
      links: [{ id: 'faq', label: 'FAQ', href: '/faq' }],
    },
    {
      id: 'contact',
      title: 'Contact',
      links: [{ id: 'write-us', label: 'Write Us', href: '/contact' }],
    },
  ],
  copyrightText: 'Copyright 2026',
  bottomLinks: [
    { id: 'privacy', label: 'Privacy', href: '/privacy' },
    { id: 'terms', label: 'Terms and Conditions', href: '/terms-and-conditions' },
  ],
  privacy: [],
  termConditions: [],
}
