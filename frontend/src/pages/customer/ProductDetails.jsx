import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { productService } from '../../services/productService'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorMessage from '../../components/common/ErrorMessage'
import SuccessToast from '../../components/common/SuccessToast'
import StarRating from '../../components/product/StarRating'
import ProductCard from '../../components/product/ProductCard'
import { getErrorMessage } from '../../services/api'

export default function ProductDetails() {
  const { id } = useParams()
  const { user } = useAuth()
  const { addToCart } = useCart()

  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [reviews, setReviews] = useState([])
  const [activeImage, setActiveImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' })
  const [reviewError, setReviewError] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError('')
      setActiveImage(0)
      setQuantity(1)
      try {
        const p = await productService.get(id)
        if (!mounted) return
        setProduct(p)
        const [relatedRes, reviewsRes] = await Promise.all([
          productService.list({ category_id: p.category_id, page_size: 4 }),
          productService.reviews(p.id),
        ])
        if (!mounted) return
        setRelated(relatedRes.items.filter((r) => r.id !== p.id))
        setReviews(reviewsRes)
      } catch (err) {
        if (mounted) setError(getErrorMessage(err))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [id])

  const handleAddToCart = async () => {
    setMessage('')
    setError('')
    try {
      await addToCart(product.id, quantity)
      setMessage('Added to cart!')
      setTimeout(() => setMessage(''), 2000)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const submitReview = async (e) => {
    e.preventDefault()
    setReviewError('')
    try {
      const created = await productService.submitReview({
        product_id: product.id,
        rating: Number(reviewForm.rating),
        comment: reviewForm.comment,
      })
      setReviews((prev) => [created, ...prev])
      setReviewForm({ rating: 5, comment: '' })
    } catch (err) {
      setReviewError(getErrorMessage(err))
    }
  }

  const [imageError, setImageError] = useState(false)

  if (loading) return <LoadingSpinner label="Loading product..." />
  if (error && !product) return <div className="max-w-3xl mx-auto py-16 px-4"><ErrorMessage message={error} /></div>
  if (!product) return null

  const hasDiscount = product.discount_price && Number(product.discount_price) < Number(product.price)
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0
  const images = product.images?.length ? product.images : [{ image_url: null }]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SuccessToast message={message} />

      <div className="grid md:grid-cols-2 gap-10">
        <div>
          <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
            {images[activeImage]?.image_url && !imageError ? (
              <img
                src={images[activeImage].image_url}
                alt={product.name}
                onError={() => setImageError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M4 8h.01M4 4h16v16H4V4z" />
              </svg>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-3">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`h-16 w-16 rounded-lg overflow-hidden border-2 ${activeImage === idx ? 'border-brand-600' : 'border-transparent'}`}
                >
                  {img.image_url && <img src={img.image_url} alt="" className="w-full h-full object-cover" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-sm text-brand-600 font-medium">{product.brand || 'ShopNexus'}</p>
          <h1 className="text-3xl font-extrabold text-gray-900 mt-1">{product.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <StarRating rating={avgRating} />
            <span className="text-sm text-gray-500">({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-gray-900">
              ₹{Number(hasDiscount ? product.discount_price : product.price).toLocaleString('en-IN')}
            </span>
            {hasDiscount && <span className="text-lg text-gray-400 line-through">₹{Number(product.price).toLocaleString('en-IN')}</span>}
          </div>

          <p className="mt-2 text-sm">
            {product.stock_quantity > 0 ? (
              <span className="text-green-600 font-medium">In Stock ({product.stock_quantity} available)</span>
            ) : (
              <span className="text-red-600 font-medium">Out of Stock</span>
            )}
          </p>

          <p className="text-gray-600 mt-4 leading-relaxed">{product.description || 'No description available.'}</p>

          <ErrorMessage message={error} />

          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center border border-gray-300 rounded-lg">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="px-3 py-2 text-gray-600">−</button>
              <span className="px-4 py-2 font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(product.stock_quantity, q + 1))}
                className="px-3 py-2 text-gray-600"
              >
                +
              </button>
            </div>
            <button onClick={handleAddToCart} disabled={product.stock_quantity <= 0} className="btn-primary flex-1">
              {product.stock_quantity <= 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>

          {!user && <p className="text-xs text-gray-400 mt-3">You'll be asked to sign in before checkout.</p>}
        </div>
      </div>

      <section className="mt-16">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Customer Reviews</h2>

        {user && (
          <form onSubmit={submitReview} className="card p-4 mb-6 max-w-lg">
            <ErrorMessage message={reviewError} />
            <div className="flex items-center gap-3 mb-3">
              <label className="text-sm font-medium text-gray-700">Rating</label>
              <select
                className="input-field w-auto"
                value={reviewForm.rating}
                onChange={(e) => setReviewForm((f) => ({ ...f, rating: e.target.value }))}
              >
                {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} star{r !== 1 ? 's' : ''}</option>)}
              </select>
            </div>
            <textarea
              className="input-field"
              rows={3}
              placeholder="Share your experience with this product..."
              value={reviewForm.comment}
              onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
            />
            <button type="submit" className="btn-secondary mt-3 text-sm">Submit Review</button>
            <p className="text-xs text-gray-400 mt-2">You can only review products from orders marked as Delivered.</p>
          </form>
        )}

        {reviews.length === 0 ? (
          <p className="text-gray-500 text-sm">No reviews yet. Be the first to review this product!</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="card p-4">
                <StarRating rating={r.rating} />
                {r.comment && <p className="text-gray-700 mt-2 text-sm">{r.comment}</p>}
                <p className="text-xs text-gray-400 mt-2">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Related Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      <Link to="/products" className="inline-block mt-10 text-brand-600 text-sm hover:underline">← Back to all products</Link>
    </div>
  )
}
