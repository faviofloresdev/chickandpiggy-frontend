'use client'

interface ShopSortFormProps {
  selectedCategory: string
  selectedPriceRanges: string[]
  selectedOptionFilters: Record<string, string[]>
  selectedSort: string
  optionFilterPrefix: string
}

function buildOptionFilterName(optionFilterPrefix: string, type: string) {
  return `${optionFilterPrefix}${type}`
}

export function ShopSortForm({
  selectedCategory,
  selectedPriceRanges,
  selectedOptionFilters,
  selectedSort,
  optionFilterPrefix,
}: ShopSortFormProps) {
  return (
    <form method="get">
      {selectedCategory !== 'all' && (
        <input type="hidden" name="category" value={selectedCategory} />
      )}
      {selectedPriceRanges.map((range) => (
        <input key={range} type="hidden" name="price" value={range} />
      ))}
      {Object.entries(selectedOptionFilters).flatMap(([type, values]) =>
        values.map((value) => (
          <input
            key={`${type}-${value}`}
            type="hidden"
            name={buildOptionFilterName(optionFilterPrefix, type)}
            value={value}
          />
        ))
      )}

      <select
        name="sort"
        defaultValue={selectedSort}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 shadow-sm focus:border-brand-400 focus:outline-none"
      >
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="price-asc">Price: Low to High</option>
        <option value="price-desc">Price: High to Low</option>
        <option value="name-asc">Name: A to Z</option>
        <option value="name-desc">Name: Z to A</option>
      </select>

      <button type="submit" className="sr-only">
        Sort
      </button>
    </form>
  )
}
