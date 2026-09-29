import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { productService } from '../../services/productService'
import ProductCard from '../../components/product/ProductCard'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import { getErrorMessage } from '../../services/api'

export default function Home() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          productService.list({ page: 1, page_size: 8, sort: 'newest' }),
          productService.categories(),
        ])
        if (!mounted) return
        setProducts(productsRes.items)
        setCategories(categoriesRes)
      } catch (err) {
        if (mounted) setError(getErrorMessage(err))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  return (
    <div>
      <section className="bg-gradient-to-br from-brand-600 to-brand-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
              Shop smarter with ShopNexus
            </h1>
            <p className="mt-4 text-brand-100 text-lg">
              Discover curated products, transparent pricing, and secure checkout — all backed
              by an enterprise-grade platform built for scale.
            </p>
            <div className="mt-8 flex gap-4">
              <Link to="/products" className="bg-white text-brand-700 px-6 py-3 rounded-lg font-semibold hover:bg-brand-50">
                Shop Now
              </Link>
              <Link to="/products" className="border border-white/60 px-6 py-3 rounded-lg font-semibold hover:bg-white/10">
                Browse Categories
              </Link>
            </div>
          </div>
          <div className="hidden md:flex justify-center">
            <div className="h-64 w-64 bg-white/10 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Shop by Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {categories.slice(0, 12).map((cat) => (
              <Link
                key={cat.id}
                to={`/products?category_id=${cat.id}`}
                className="card p-4 text-center hover:shadow-md transition-shadow"
              >
                <div className="h-10 w-10 rounded-full bg-brand-50 text-brand-600 mx-auto mb-2 flex items-center justify-center font-bold">
                  {cat.name[0]}
                </div>
                <p className="text-sm font-medium text-gray-700 truncate">{cat.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
          <Link to="/products" className="text-brand-600 font-medium hover:underline text-sm">View all →</Link>
        </div>

        {loading && <LoadingSpinner label="Loading products..." />}
        <ErrorMessage message={error} />

        {!loading && !error && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      <section className="bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid md:grid-cols-3 gap-8 text-center">
          <div>
            <h3 className="font-semibold text-gray-900">Secure Payments</h3>
            <p className="text-gray-500 text-sm mt-1">Razorpay-backed checkout with server-verified transactions.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Fast Delivery</h3>
            <p className="text-gray-500 text-sm mt-1">Real-time order tracking from checkout to doorstep.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Easy Returns</h3>
            <p className="text-gray-500 text-sm mt-1">Hassle-free returns backed by our customer promise.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
