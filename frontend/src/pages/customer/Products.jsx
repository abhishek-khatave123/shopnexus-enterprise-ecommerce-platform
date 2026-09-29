import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { productService } from '../../services/productService'
import ProductCard from '../../components/product/ProductCard'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import EmptyState from '../../components/common/EmptyState'
import Pagination from '../../components/common/Pagination'
import { getErrorMessage } from '../../services/api'

const PRICE_RANGES = [
  { label: 'All Prices', min: '', max: '' },
  { label: '₹0 – ₹1,000', min: 0, max: 1000 },
  { label: '₹1,000 – ₹5,000', min: 1000, max: 5000 },
  { label: '₹5,000+', min: 5000, max: '' },
]

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [categories, setCategories] = useState([])
  const [data, setData] = useState({ items: [], total: 0, page: 1, total_pages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')

  const page = Number(searchParams.get('page') || 1)
  const search = searchParams.get('search') || ''
  const categoryId = searchParams.get('category_id') || ''
  const priceRangeIdx = searchParams.get('price') || '0'
  const sort = searchParams.get('sort') || 'newest'

  const updateParams = (updates) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (value === '' || value === null || value === undefined) next.delete(key)
      else next.set(key, value)
    })
    if (!('page' in updates)) next.set('page', '1')
    setSearchParams(next)
  }

  useEffect(() => {
    productService.categories().then(setCategories).catch(() => {})
  }, [])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const range = PRICE_RANGES[Number(priceRangeIdx)] || PRICE_RANGES[0]
      const res = await productService.list({
        page,
        page_size: 12,
        search: search || undefined,
        category_id: categoryId || undefined,
        min_price: range.min === '' ? undefined : range.min,
        max_price: range.max === '' ? undefined : range.max,
        sort,
      })
      setData(res)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [page, search, categoryId, priceRangeIdx, sort])

  useEffect(() => { loadProducts() }, [loadProducts])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    updateParams({ search: searchInput })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">All Products</h1>

      <div className="grid md:grid-cols-4 gap-8">
        <aside className="md:col-span-1 space-y-6">
          <form onSubmit={handleSearchSubmit}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              className="input-field"
              placeholder="Product name or SKU"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </form>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select className="input-field" value={categoryId} onChange={(e) => updateParams({ category_id: e.target.value })}>
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
            <select className="input-field" value={priceRangeIdx} onChange={(e) => updateParams({ price: e.target.value })}>
              {PRICE_RANGES.map((r, idx) => (
                <option key={r.label} value={idx}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select className="input-field" value={sort} onChange={(e) => updateParams({ sort: e.target.value })}>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </aside>

        <div className="md:col-span-3">
          {loading && <LoadingSpinner label="Loading products..." />}
          <ErrorMessage message={error} />

          {!loading && !error && data.items.length === 0 && (
            <EmptyState title="No products found" description="Try adjusting your search or filters." />
          )}

          {!loading && !error && data.items.length > 0 && (
            <>
              <p className="text-sm text-gray-500 mb-4">{data.total} product{data.total !== 1 ? 's' : ''} found</p>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {data.items.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
              <Pagination page={data.page} totalPages={data.total_pages} onPageChange={(p) => updateParams({ page: p })} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
