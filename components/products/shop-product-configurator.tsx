'use client'

import { useEffect, useMemo, useState } from 'react'
import { Minus, Plus, ShoppingCart } from 'lucide-react'

import type { Product, ProductOptionGroup, ProductVariant } from '@/lib/api/contracts'
import { toast } from '@/hooks/use-toast'
import { useCartStore } from '@/lib/store/cart-store'

const colorOptionMap: Record<string, string> = {
  black: 'bg-black',
  blue: 'bg-blue-500',
  brown: 'bg-amber-700',
  gray: 'bg-gray-400',
  green: 'bg-green-500',
  grey: 'bg-gray-400',
  orange: 'bg-orange-400',
  pink: 'bg-pink-400',
  purple: 'bg-violet-500',
  red: 'bg-red-500',
  white: 'bg-white',
  yellow: 'bg-yellow-300',
}

function getColorOptionClass(color: string) {
  return colorOptionMap[color.trim().toLowerCase()] ?? 'bg-neutral-300'
}

function getColorOptionStyle(hexColor?: string) {
  return hexColor ? { backgroundColor: hexColor } : undefined
}

function findMatchingVariant(
  variants: ProductVariant[] | undefined,
  selectedOptions: Record<string, string>
) {
  const selectedEntries = Object.entries(selectedOptions).filter(([, value]) => Boolean(value))

  if (selectedEntries.length === 0) {
    return undefined
  }

  return variants?.find((variant) =>
    selectedEntries.every(
      ([type, value]) => variant.optionValues?.[type]?.value === value
    )
  )
}

function isColorOption(option: ProductOptionGroup) {
  return option.type === 'color'
}

function getSelectedOptionValueIds(
  productOptions: ProductOptionGroup[],
  selectedOptions: Record<string, string>
) {
  return productOptions.reduce<Record<string, string>>((acc, option) => {
    const selectedValue = selectedOptions[option.type]

    if (!selectedValue) {
      return acc
    }

    const optionValue = option.values.find((value) => value.value === selectedValue)

    if (optionValue?.id) {
      acc[option.type] = optionValue.id
    }

    return acc
  }, {})
}

interface ShopProductConfiguratorProps {
  product: Product
}

export function ShopProductConfigurator({
  product,
}: ShopProductConfiguratorProps) {
  const addItem = useCartStore((state) => state.addItem)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    setSelectedOptions({})
    setQuantity(1)
  }, [product.id])

  const productOptions = useMemo(
    () => (product.productOptions ?? []).filter((option) => option.values.length > 0),
    [product.productOptions]
  )
  const selectedVariant = useMemo(
    () => findMatchingVariant(product.variants, selectedOptions),
    [product.variants, selectedOptions]
  )

  const displayImage = selectedVariant?.image || product.image
  const displayPrice = selectedVariant?.price ?? product.price
  const requiresOptionSelection = productOptions.length > 0
  const canAddToCart =
    !requiresOptionSelection ||
    productOptions.every((option) => Boolean(selectedOptions[option.type]))
  const selectedOptionValueIds = useMemo(
    () => getSelectedOptionValueIds(productOptions, selectedOptions),
    [productOptions, selectedOptions]
  )

  const handleAddToCart = () => {
    addItem(
      {
        ...product,
        image: displayImage,
        price: displayPrice,
        selectedVariantId: selectedVariant?.strapiId,
        selectedColor: selectedOptions.color,
        selectedSize: selectedOptions.size,
        selectedOptions,
        selectedOptionValueIds,
      },
      quantity
    )

    toast({
      title: 'Producto agregado',
      description: `${quantity} ${quantity === 1 ? 'unidad fue agregada' : 'unidades fueron agregadas'} al carrito.`,
    })
  }

  return (
    <section
      id="selected-product"
      className="mb-12 rounded-[2rem] border p-6 shadow-[0_20px_60px_rgba(190,224,224,0.18)] md:p-8"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-brand-400) 10%, white)',
        borderColor: 'color-mix(in srgb, var(--color-brand-400) 48%, var(--color-brand-300))',
      }}
    >
      <div className="mb-6 flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">
          Selected product
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-brand-500">
          {product.name}
        </h2>
        <p className="text-base text-gray-500">
          Selecciona los detalles antes de agregarlo al carrito.
        </p>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="aspect-square overflow-hidden rounded-[1.75rem] bg-brand-100">
          <img
            src={displayImage}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <p className="text-3xl font-semibold text-brand-700">
              ${displayPrice.toFixed(2)}
            </p>
          </div>

          {productOptions.map((option) => (
            <div key={`${product.id}-${option.id}`}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="font-medium text-gray-800">{option.label}</p>
                {option.values.find((value) => value.value === selectedOptions[option.type])?.label ? (
                  <p className="text-sm text-gray-500">
                    {option.values.find((value) => value.value === selectedOptions[option.type])?.label}
                  </p>
                ) : null}
              </div>

              {isColorOption(option) ? (
                <div className="flex flex-wrap gap-3">
                  {option.values.map((value) => {
                    const isSelected = selectedOptions[option.type] === value.value

                    return (
                      <button
                        key={`${product.id}-${option.type}-${value.value}`}
                        type="button"
                        onClick={() =>
                          setSelectedOptions((current) => ({
                            ...current,
                            [option.type]: value.value,
                          }))
                        }
                        className={`flex flex-col items-center gap-2 rounded-2xl border px-3 py-3 transition-colors ${
                          isSelected
                            ? 'border-brand-500 bg-brand-150'
                            : 'border-brand-300 bg-white hover:bg-brand-75'
                        }`}
                        aria-pressed={isSelected}
                        aria-label={`Seleccionar ${option.label} ${value.label}`}
                      >
                        <span
                          className={`h-9 w-9 rounded-full border-2 ${
                            isSelected ? 'border-brand-500' : 'border-black/10'
                          } ${getColorOptionClass(value.value)}`}
                          style={getColorOptionStyle(value.hexColor)}
                          aria-hidden="true"
                        />
                        <span className="text-xs font-medium capitalize text-brand-800">
                          {value.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {option.values.map((value) => {
                    const isSelected = selectedOptions[option.type] === value.value

                    return (
                      <button
                        key={`${product.id}-${option.type}-${value.value}`}
                        type="button"
                        onClick={() =>
                          setSelectedOptions((current) => ({
                            ...current,
                            [option.type]: value.value,
                          }))
                        }
                        className={`inline-flex items-center rounded-full border px-4 py-2 text-sm transition-colors ${
                          isSelected
                            ? 'border-brand-500 bg-brand-150 text-brand-800'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                        aria-pressed={isSelected}
                      >
                        {value.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ))}

          <div>
            <p className="mb-3 font-medium text-gray-800">Cantidad</p>
            <div className="inline-flex items-center gap-3 rounded-full border border-gray-200 bg-gray-50 px-3 py-2">
              <button
                type="button"
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 transition-colors hover:bg-gray-100"
                aria-label="Disminuir cantidad"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-8 text-center text-base font-semibold text-gray-800">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((current) => current + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 transition-colors hover:bg-gray-100"
                aria-label="Aumentar cantidad"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!canAddToCart}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-400 px-6 py-4 text-base font-medium text-white transition-colors hover:bg-brand-450 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingCart className="h-5 w-5" />
            Agregar al carrito
          </button>
        </div>
      </div>

      {product.description ? (
        <div className="mt-8 rounded-[1.5rem] bg-white/70 p-5 md:p-6">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
            Description
          </h3>
          <div className="mt-3 max-w-3xl whitespace-pre-line text-base leading-relaxed text-gray-600">
            {product.description}
          </div>
        </div>
      ) : null}
    </section>
  )
}
