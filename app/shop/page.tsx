import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import { ProductCard } from '@/components/products/product-card'
import { ShopProductConfigurator } from '@/components/products/shop-product-configurator'
import { ShopSortForm } from '@/components/products/shop-sort-form'
import { bffApi } from '@/lib/api/bff'
import type { Category, Product, ProductOptionGroup, ProductOptionValue } from '@/lib/api/contracts'
import { buildPageMetadata } from '@/lib/seo/metadata'

const PRODUCTS_PER_PAGE = 6
const PRICE_RANGES = ['under-10', '10-15', '15-20', 'over-20'] as const
const OPTION_FILTER_PREFIX = 'option_'

type SearchParams = Record<string, string | string[] | undefined>

export const revalidate = 300

interface ProductOptionFilterValue extends ProductOptionValue {
  count: number
}

interface ProductOptionFilterGroup {
  type: string
  label: string
  values: ProductOptionFilterValue[]
}

function readSingleParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

function readMultiParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value
  }

  if (typeof value === 'string' && value.length > 0) {
    return [value]
  }

  return []
}

function toUrlSearchParams(params: SearchParams) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => searchParams.append(key, entry))
      return
    }

    if (typeof value === 'string') {
      searchParams.set(key, value)
    }
  })

  return searchParams
}

function buildShopHref(
  params: URLSearchParams,
  updates: Record<string, string | string[] | number | undefined>
) {
  const nextParams = new URLSearchParams(params)

  Object.entries(updates).forEach(([key, value]) => {
    nextParams.delete(key)

    if (value === undefined || value === '') {
      return
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry) {
          nextParams.append(key, entry)
        }
      })
      return
    }

    nextParams.set(key, String(value))
  })

  const query = nextParams.toString()
  return query ? `/shop?${query}` : '/shop'
}

function getPriceRangeLabel(range: (typeof PRICE_RANGES)[number]) {
  switch (range) {
    case 'under-10':
      return 'Under $10'
    case '10-15':
      return '$10 - $15'
    case '15-20':
      return '$15 - $20'
    case 'over-20':
      return 'Over $20'
  }
}

function matchesPriceRange(price: number, range: string) {
  switch (range) {
    case 'under-10':
      return price < 10
    case '10-15':
      return price >= 10 && price < 15
    case '15-20':
      return price >= 15 && price <= 20
    case 'over-20':
      return price > 20
    default:
      return false
  }
}

function sortProducts(products: Product[], sort: string) {
  const sortedProducts = [...products]

  switch (sort) {
    case 'price-asc':
      sortedProducts.sort((a, b) => a.price - b.price)
      return sortedProducts
    case 'price-desc':
      sortedProducts.sort((a, b) => b.price - a.price)
      return sortedProducts
    case 'name-asc':
      sortedProducts.sort((a, b) => a.name.localeCompare(b.name))
      return sortedProducts
    case 'name-desc':
      sortedProducts.sort((a, b) => b.name.localeCompare(a.name))
      return sortedProducts
    case 'oldest':
      return sortedProducts.reverse()
    default:
      return sortedProducts
  }
}

function buildCategoryList(products: Product[], categories: Category[]) {
  const countByKey = new Map<string, number>()

  products.forEach((product) => {
    product.categories?.forEach((category) => {
      const key = category.slug ?? category.id
      countByKey.set(key, (countByKey.get(key) ?? 0) + 1)
    })
  })

  const mergedCategories = categories.map((category) => {
    const key = category.slug ?? category.id

    return {
      ...category,
      count: countByKey.get(key) ?? category.count ?? 0,
    }
  })

  const productOnlyCategories = products
    .flatMap((product) => product.categories ?? [])
    .filter(
      (category, index, allCategories) =>
        allCategories.findIndex(
          (entry) => (entry.slug ?? entry.id) === (category.slug ?? category.id)
        ) === index
    )
    .filter(
      (category) =>
        !mergedCategories.some(
          (entry) => (entry.slug ?? entry.id) === (category.slug ?? category.id)
        )
    )
    .map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      count: countByKey.get(category.slug ?? category.id) ?? 0,
    }))

  return [...mergedCategories, ...productOnlyCategories].sort((a, b) =>
    a.name.localeCompare(b.name)
  )
}

function buildOptionFilterName(type: string) {
  return `${OPTION_FILTER_PREFIX}${type}`
}

function readSelectedOptionFilters(searchParams: SearchParams) {
  const selectedOptionFilters: Record<string, string[]> = {}

  Object.entries(searchParams).forEach(([key, value]) => {
    if (!key.startsWith(OPTION_FILTER_PREFIX)) {
      return
    }

    const optionType = key.slice(OPTION_FILTER_PREFIX.length)
    const optionValues = readMultiParam(value).filter(Boolean)

    if (optionType && optionValues.length > 0) {
      selectedOptionFilters[optionType] = optionValues
    }
  })

  return selectedOptionFilters
}

function collectProductOptionValues(product: Product, optionType: string) {
  const variantValues = product.variants
    ?.map((variant) => variant.optionValues?.[optionType]?.value)
    .filter((value): value is string => Boolean(value))

  if (variantValues && variantValues.length > 0) {
    return [...new Set(variantValues)]
  }

  const optionGroup = product.productOptions?.find((option) => option.type === optionType)

  return optionGroup ? optionGroup.values.map((value) => value.value) : []
}

function productMatchesOptionFilters(
  product: Product,
  selectedOptionFilters: Record<string, string[]>
) {
  const activeFilters = Object.entries(selectedOptionFilters).filter(([, values]) => values.length > 0)

  if (activeFilters.length === 0) {
    return true
  }

  if (product.variants && product.variants.length > 0) {
    return product.variants.some((variant) =>
      activeFilters.every(([type, values]) => {
        const optionValue = variant.optionValues?.[type]?.value
        return optionValue ? values.includes(optionValue) : false
      })
    )
  }

  return activeFilters.every(([type, values]) =>
    collectProductOptionValues(product, type).some((value) => values.includes(value))
  )
}

function buildOptionFilterGroups(products: Product[]) {
  const groups = new Map<
    string,
    {
      label: string
      values: Map<string, ProductOptionFilterValue>
    }
  >()

  products.forEach((product) => {
    const seenProductValues = new Set<string>()

    ;(product.productOptions ?? []).forEach((option: ProductOptionGroup) => {
      const existingGroup = groups.get(option.type) ?? {
        label: option.label,
        values: new Map<string, ProductOptionFilterValue>(),
      }

      option.values.forEach((value) => {
        const existingValue = existingGroup.values.get(value.value)
        const seenKey = `${option.type}:${value.value}`

        if (!existingValue) {
          existingGroup.values.set(value.value, {
            ...value,
            count: 0,
          })
        }

        if (!seenProductValues.has(seenKey)) {
          const currentValue = existingGroup.values.get(value.value)
          if (currentValue) {
            currentValue.count += 1
          }
          seenProductValues.add(seenKey)
        }
      })

      groups.set(option.type, existingGroup)
    })
  })

  return [...groups.entries()]
    .map(([type, group]) => ({
      type,
      label: group.label,
      values: [...group.values.values()].sort((a, b) => a.label.localeCompare(b.label)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

function isColorFilter(optionType: string) {
  return optionType === 'color'
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}): Promise<Metadata> {
  const resolvedSearchParams = await searchParams
  const hasFilteringParams = Object.keys(resolvedSearchParams).length > 0

  return buildPageMetadata({
    title: 'Shop Artisan Soaps',
    description:
      'Browse handcrafted soaps and artisan self-care products made for gentle, everyday routines.',
    path: '/shop',
    noIndex: hasFilteringParams,
  })
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolvedSearchParams = await searchParams
  const [products, categories] = await Promise.all([
    bffApi.getProducts(),
    bffApi.getCategories(),
  ])

  const urlSearchParams = toUrlSearchParams(resolvedSearchParams)
  const browseSearchParams = new URLSearchParams(urlSearchParams)
  browseSearchParams.delete('product')

  const selectedCategory = readSingleParam(resolvedSearchParams.category) ?? 'all'
  const selectedPriceRanges = readMultiParam(resolvedSearchParams.price)
  const selectedSort = readSingleParam(resolvedSearchParams.sort) ?? 'newest'
  const selectedProductId = readSingleParam(resolvedSearchParams.product)
  const selectedOptionFilters = readSelectedOptionFilters(resolvedSearchParams)
  const requestedPage = Number(readSingleParam(resolvedSearchParams.page) ?? '1')
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1

  const categoryOptions = buildCategoryList(products, categories)
  const optionFilterGroups = buildOptionFilterGroups(products)

  const filteredProducts = sortProducts(
    products.filter((product) => {
      const matchesCategory =
        selectedCategory === 'all' ||
        Boolean(
          product.categories?.some(
            (category) => (category.slug ?? category.id) === selectedCategory
          )
        )
      const matchesPrice =
        selectedPriceRanges.length === 0 ||
        selectedPriceRanges.some((range) => matchesPriceRange(product.price, range))
      const matchesOptions = productMatchesOptionFilters(product, selectedOptionFilters)

      return matchesCategory && matchesPrice && matchesOptions
    }),
    selectedSort
  )

  const selectedProduct = selectedProductId
    ? filteredProducts.find(
        (product) => product.id === selectedProductId || product.slug === selectedProductId
      )
    : undefined

  const totalProducts = filteredProducts.length
  const totalPages = Math.max(1, Math.ceil(totalProducts / PRODUCTS_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = totalProducts === 0 ? 0 : (safeCurrentPage - 1) * PRODUCTS_PER_PAGE
  const paginatedProducts = filteredProducts.slice(
    startIndex,
    startIndex + PRODUCTS_PER_PAGE
  )
  const showingFrom = totalProducts === 0 ? 0 : startIndex + 1
  const showingTo = Math.min(startIndex + PRODUCTS_PER_PAGE, totalProducts)

  return (
    <>
      <div className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 py-8 md:px-12">
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="transition-colors hover:text-brand-500">
              Home
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-gray-900">Shop</span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-brand-500">
            Our Shop
          </h1>
        </div>
      </div>

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-12 md:flex-row md:px-12">
        <aside className="flex w-full flex-col gap-10 md:w-1/4">
          <div>
            <h3 className="mb-4 border-b border-gray-100 pb-2 text-lg font-semibold tracking-tight text-gray-900">
              Categories
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href={buildShopHref(browseSearchParams, {
                    category: undefined,
                    page: undefined,
                  })}
                  className={`flex w-full items-center justify-between text-left transition-colors ${
                    selectedCategory === 'all'
                      ? 'font-medium text-brand-500'
                      : 'text-gray-600 hover:text-brand-500'
                  }`}
                >
                  <span>All products</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      selectedCategory === 'all'
                        ? 'bg-brand-400/10 text-brand-500'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {products.length}
                  </span>
                </Link>
              </li>

              {categoryOptions.map((category) => {
                const key = category.slug ?? category.id
                const isActive = selectedCategory === key

                return (
                  <li key={category.id}>
                    <Link
                      href={buildShopHref(browseSearchParams, {
                        category: key,
                        page: undefined,
                      })}
                      className={`flex w-full items-center justify-between text-left transition-colors ${
                        isActive
                          ? 'font-medium text-brand-500'
                          : 'text-gray-600 hover:text-brand-500'
                      }`}
                    >
                      <span>{category.name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          isActive
                            ? 'bg-brand-400/10 text-brand-500'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {category.count}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>

          <form method="get" className="space-y-8">
            {selectedCategory !== 'all' && (
              <input type="hidden" name="category" value={selectedCategory} />
            )}
            {selectedSort !== 'newest' && (
              <input type="hidden" name="sort" value={selectedSort} />
            )}

            <div>
              <h3 className="mb-4 border-b border-gray-100 pb-2 text-lg font-semibold tracking-tight text-gray-900">
                Price
              </h3>
              <div className="space-y-3">
                {PRICE_RANGES.map((range) => (
                  <label
                    key={range}
                    className="group flex cursor-pointer items-center gap-3"
                  >
                    <input
                      type="checkbox"
                      name="price"
                      value={range}
                      defaultChecked={selectedPriceRanges.includes(range)}
                      className="h-4 w-4 rounded border-gray-300 text-brand-400 focus:ring-brand-400"
                    />
                    <span className="text-gray-600 transition-colors group-hover:text-brand-500">
                      {getPriceRangeLabel(range)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {optionFilterGroups.map((optionGroup) => {
              const filterName = buildOptionFilterName(optionGroup.type)
              const selectedValues = selectedOptionFilters[optionGroup.type] ?? []

              return (
                <div key={optionGroup.type}>
                  <h3 className="mb-4 border-b border-gray-100 pb-2 text-lg font-semibold tracking-tight text-gray-900">
                    {optionGroup.label}
                  </h3>
                  <div className="space-y-3">
                    {optionGroup.values.map((value) => (
                      <label
                        key={`${optionGroup.type}-${value.value}`}
                        className="group flex cursor-pointer items-center gap-3"
                      >
                        <input
                          type="checkbox"
                          name={filterName}
                          value={value.value}
                          defaultChecked={selectedValues.includes(value.value)}
                          className="h-4 w-4 rounded border-gray-300 text-brand-400 focus:ring-brand-400"
                        />
                        {isColorFilter(optionGroup.type) ? (
                          <span
                            className="h-3 w-3 rounded-full border border-black/10"
                            style={{ backgroundColor: value.hexColor ?? value.value }}
                            aria-hidden="true"
                          />
                        ) : null}
                        <span className="text-gray-600 transition-colors group-hover:text-brand-500">
                          {value.label}
                        </span>
                        <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                          {value.count}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}

            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
              >
                Apply filters
              </button>
              <Link
                href="/shop"
                className="rounded-full border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900"
              >
                Reset
              </Link>
            </div>
          </form>
        </aside>

        <div className="flex w-full flex-col md:w-3/4">
          {selectedProduct ? <ShopProductConfigurator product={selectedProduct} /> : null}

          <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <p className="text-sm text-gray-500">
              Showing {showingFrom}-{showingTo} of {totalProducts} results
            </p>

            <ShopSortForm
              selectedCategory={selectedCategory}
              selectedPriceRanges={selectedPriceRanges}
              selectedOptionFilters={selectedOptionFilters}
              selectedSort={selectedSort}
              optionFilterPrefix={OPTION_FILTER_PREFIX}
            />
          </div>

          {paginatedProducts.length > 0 ? (
            <div className="grid w-full grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-3">
              {paginatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-8 py-16 text-center text-gray-500">
              No products matched the selected filters.
            </div>
          )}

          {totalPages > 1 ? (
            <div className="mt-12 flex justify-center gap-2 border-t border-gray-100 pt-8">
              {Array.from({ length: totalPages }, (_, index) => {
                const page = index + 1
                const isActive = page === safeCurrentPage

                return (
                  <Link
                    key={page}
                    href={buildShopHref(browseSearchParams, { page })}
                    className={`flex h-10 w-10 items-center justify-center rounded-full font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-400 text-white'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </Link>
                )
              })}

              {safeCurrentPage < totalPages ? (
                <Link
                  href={buildShopHref(browseSearchParams, { page: safeCurrentPage + 1 })}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 font-medium text-gray-600 transition-colors hover:bg-gray-100"
                >
                  <ChevronRight className="h-5 w-5" />
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </>
  )
}
